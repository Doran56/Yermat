// Recompresse les vidéos déjà publiées (bucket "videos") et backfill leur
// thumbnail_url, pour appliquer rétroactivement la réduction d'egress mise
// en place pour les nouvelles publications (voir app/perform/[barId].tsx).
//
// Nécessite une SUPABASE_SERVICE_ROLE_KEY (bypass RLS pour écrire dans le
// dossier de n'importe quel utilisateur) — à mettre dans .env.backfill.local
// (déjà ignoré par git via le pattern ".env*.local").
//
// Ne traite QUE les performances sans thumbnail_url. C'est volontaire : une
// exécution sur celles qui en ont déjà une retéléchargerait puis recompresserait
// des vidéos déjà compressées — de l'egress pur, et une perte de qualité par
// double encodage.
//
// La vidéo n'est réencodée que si elle dépasse --compress-over (défaut 3 Mo).
// En dessous, on se contente d'extraire la miniature : rien ne justifie de
// réuploader un fichier déjà léger.
//
// Usage:
//   node scripts/backfill_compress_videos.mjs --dry-run           # simulate, no writes
//   node scripts/backfill_compress_videos.mjs --only=<performance-id>
//   node scripts/backfill_compress_videos.mjs --limit=5
//   node scripts/backfill_compress_videos.mjs --compress-over=3   # seuil en Mo
//   node scripts/backfill_compress_videos.mjs                     # full run

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const execFileAsync = promisify(execFile);
const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

function loadEnvFile(path) {
  const out = {};
  let content;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    return out;
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const baseEnv = loadEnvFile(join(ROOT, '.env'));
const secretEnv = loadEnvFile(join(ROOT, '.env.backfill.local'));

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || baseEnv.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || secretEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
    'Put the service role key in .env.backfill.local as:\n' +
    '  SUPABASE_SERVICE_ROLE_KEY=eyJ...\n'
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const onlyArg = args.find(a => a.startsWith('--only='));
const ONLY_ID = onlyArg ? onlyArg.split('=')[1] : null;
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const thresholdArg = args.find(a => a.startsWith('--compress-over='));
const COMPRESS_OVER_BYTES = (thresholdArg ? parseFloat(thresholdArg.split('=')[1]) : 3) * 1024 * 1024;

const BUCKET = 'videos';
const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function pathFromPublicUrl(url) {
  if (!url || !url.startsWith(PUBLIC_PREFIX)) return null;
  return decodeURIComponent(url.slice(PUBLIC_PREFIX.length));
}

async function downloadTo(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buf);
  return buf.length;
}

async function ffprobeDurationSeconds(path) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    path,
  ]);
  return parseFloat(stdout.trim());
}

async function compressVideo(inputPath, outputPath) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-vf', "scale='min(1280,iw)':-2",
    '-c:v', 'libx264',
    '-crf', '26',
    '-preset', 'veryfast',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    outputPath,
  ]);
}

async function extractThumbnail(inputPath, outputPath) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-ss', '00:00:00',
    '-frames:v', '1',
    '-q:v', '3',
    outputPath,
  ]);
}

function fmtMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function processOne(perf, tmpRoot, stats) {
  const path = pathFromPublicUrl(perf.video_url);
  if (!path) {
    console.warn(`[skip] ${perf.id}: video_url is not a recognizable public storage URL`);
    stats.skipped++;
    return;
  }

  const ext = extname(path) || '.mov';
  const workDir = mkdtempSync(join(tmpRoot, 'v-'));
  const inputPath = join(workDir, `in${ext}`);
  const outputPath = join(workDir, 'out.mp4');
  const thumbPath = join(workDir, 'thumb.jpg');

  try {
    const originalSize = await downloadTo(perf.video_url, inputPath);
    const shouldCompress = originalSize > COMPRESS_OVER_BYTES;

    // Source de la miniature : le fichier réencodé s'il y en a un, l'original sinon.
    let thumbSource = inputPath;
    let compressedBuf = null;

    if (shouldCompress) {
      const originalDuration = await ffprobeDurationSeconds(inputPath);
      await compressVideo(inputPath, outputPath);
      const compressedDuration = await ffprobeDurationSeconds(outputPath);

      // Sanity check: refuse to overwrite if the re-encode looks broken
      // (duration should match within a second).
      if (!Number.isFinite(compressedDuration) || Math.abs(compressedDuration - originalDuration) > 1) {
        throw new Error(
          `duration mismatch after compression (original ${originalDuration}s, compressed ${compressedDuration}s) — refusing to upload`
        );
      }

      compressedBuf = readFileSync(outputPath);
      thumbSource = outputPath;
    }

    await extractThumbnail(thumbSource, thumbPath);
    const thumbBuf = readFileSync(thumbPath);

    stats.originalBytes += originalSize;
    stats.compressedBytes += compressedBuf ? compressedBuf.length : originalSize;
    stats.processed++;
    if (!shouldCompress) stats.thumbOnly++;

    const verb = DRY_RUN ? 'dry-run' : 'upload';
    if (shouldCompress) {
      console.log(
        `[${verb}] ${perf.id}: ${fmtMB(originalSize)} -> ${fmtMB(compressedBuf.length)} ` +
        `(-${(100 - (compressedBuf.length / originalSize) * 100).toFixed(0)}%) + miniature ${Math.round(thumbBuf.length / 1024)} ko`
      );
    } else {
      console.log(
        `[${verb}] ${perf.id}: ${fmtMB(originalSize)} déjà léger — miniature seule ` +
        `(${Math.round(thumbBuf.length / 1024)} ko), vidéo non touchée`
      );
    }

    if (DRY_RUN) return;

    if (compressedBuf) {
      const { error: videoUploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, compressedBuf, {
          contentType: 'video/mp4',
          upsert: true,
          cacheControl: '31536000',
        });
      if (videoUploadError) throw new Error(`video upload failed: ${videoUploadError.message}`);
    }

    let thumbnailUrl = perf.thumbnail_url;
    if (!thumbnailUrl) {
      const thumbPathInBucket = path.replace(/\.[^./]+$/, '') + '_thumb.jpg';
      const { error: thumbUploadError } = await supabase.storage
        .from(BUCKET)
        .upload(thumbPathInBucket, thumbBuf, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '31536000',
        });
      if (thumbUploadError) throw new Error(`thumbnail upload failed: ${thumbUploadError.message}`);

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(thumbPathInBucket);
      thumbnailUrl = pub.publicUrl;

      const { error: updateError } = await supabase
        .from('performances')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', perf.id);
      if (updateError) throw new Error(`DB update failed: ${updateError.message}`);
    }

    stats.uploaded++;
  } catch (err) {
    stats.failed++;
    stats.failures.push({ id: perf.id, error: err instanceof Error ? err.message : String(err) });
    console.error(`[fail] ${perf.id}: ${err instanceof Error ? err.message : err}`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

async function main() {
  let query = supabase
    .from('performances')
    .select('id, user_id, video_url, thumbnail_url')
    .not('video_url', 'is', null)
    // Garde-fou : sans ce filtre, une seconde exécution retéléchargerait et
    // recompresserait tout le corpus déjà traité.
    .is('thumbnail_url', null)
    .order('created_at', { ascending: true });

  if (ONLY_ID) query = query.eq('id', ONLY_ID);

  const { data: perfs, error } = await query;
  if (error) throw error;

  const targets = perfs.slice(0, LIMIT);
  console.log(`${DRY_RUN ? 'DRY RUN — ' : ''}Processing ${targets.length} performance(s)...\n`);

  const tmpRoot = mkdtempSync(join(tmpdir(), 'yermat-backfill-'));
  const stats = {
    processed: 0, uploaded: 0, skipped: 0, failed: 0, thumbOnly: 0,
    originalBytes: 0, compressedBytes: 0, failures: [],
  };

  try {
    // Séquentiel : simple et évite de saturer la bande passante/API pour un
    // batch ponctuel de quelques centaines de vidéos.
    for (const perf of targets) {
      await processOne(perf, tmpRoot, stats);
    }
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }

  console.log('\n--- Summary ---');
  console.log(
    `Processed: ${stats.processed}, Uploaded: ${stats.uploaded}, ` +
    `Miniature seule: ${stats.thumbOnly}, Skipped: ${stats.skipped}, Failed: ${stats.failed}`
  );
  if (stats.originalBytes > 0) {
    console.log(
      `Size: ${fmtMB(stats.originalBytes)} -> ${fmtMB(stats.compressedBytes)} ` +
      `(-${(100 - (stats.compressedBytes / stats.originalBytes) * 100).toFixed(0)}%)`
    );
  }
  if (stats.failures.length > 0) {
    console.log('\nFailures:');
    for (const f of stats.failures) console.log(`  ${f.id}: ${f.error}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
