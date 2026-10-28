/**
 * server/scripts/seedCatalog.js
 * Dedicated, explicit seeding script for Agent Travel Demo Showcase Catalog.
 * Targets the existing DynamoDB table 'AgentTravelBookings' in 'ap-southeast-2'.
 *
 * Guarantees:
 * 1. Strict idempotency via conditional puts (attribute_not_exists(id)).
 * 2. Never overwrites customer bookings, orders, webhook records, or existing catalog data.
 * 3. Requires explicit '--confirm' flag to perform any writes.
 * 4. Zero exposure of credentials or secrets in logs.
 * 5. Validates AWS Region ('ap-southeast-2') and Table ('AgentTravelBookings') prior to execution.
 */

import dotenv from 'dotenv';
import {
  REGION,
  BOOKINGS_TABLE,
  DEMO_CATALOG_DESTINATIONS,
  DEMO_CATALOG_TRIPS,
  createRepository,
} from '../awsConfig.js';

dotenv.config();

const EXPECTED_REGION = 'ap-southeast-2';
const EXPECTED_TABLE = 'AgentTravelBookings';

async function main() {
  const args = process.argv.slice(2);
  const isConfirmed = args.includes('--confirm');
  const isHelp = args.includes('--help') || args.includes('-h');

  console.log('================================================================');
  console.log('  AGENT TRAVEL — DYNAMODB CATALOG SHOWCASE SEEDING UTILITY     ');
  console.log('================================================================');

  if (isHelp) {
    console.log(`
Usage:
  node server/scripts/seedCatalog.js [flags]
  npm run seed:catalog [-- flags]

Flags:
  --confirm    Explicitly execute writes to the configured DynamoDB table.
               Without this flag, the script runs in safe PREVIEW (dry-run) mode.
  --help, -h   Show this help message.
`);
    process.exit(0);
  }

  // 1. Validate Region and Table Target
  const effectiveRegion = REGION || process.env.AWS_REGION || EXPECTED_REGION;
  const effectiveTable = BOOKINGS_TABLE || process.env.DYNAMODB_TABLE_BOOKINGS || EXPECTED_TABLE;

  console.log(`[CONFIG VALIDATION]`);
  console.log(`  Configured AWS Region : ${effectiveRegion}`);
  console.log(`  Configured Table      : ${effectiveTable}`);

  if (effectiveRegion !== EXPECTED_REGION) {
    console.error(`\n[FATAL SAFETY BLOCK] Region mismatch!`);
    console.error(`  Expected : '${EXPECTED_REGION}'`);
    console.error(`  Found    : '${effectiveRegion}'`);
    console.error(`Aborting without writing. Set AWS_REGION=${EXPECTED_REGION} to proceed.\n`);
    process.exit(1);
  }

  if (effectiveTable !== EXPECTED_TABLE) {
    console.error(`\n[FATAL SAFETY BLOCK] Table mismatch!`);
    console.error(`  Expected : '${EXPECTED_TABLE}'`);
    console.error(`  Found    : '${effectiveTable}'`);
    console.error(`Aborting without writing. Target must be '${EXPECTED_TABLE}'.\n`);
    process.exit(1);
  }

  console.log(`  Target Verification   : OK (Matches authorized ${EXPECTED_TABLE} in ${EXPECTED_REGION})`);

  // 2. Inventory Preview
  const destCount = DEMO_CATALOG_DESTINATIONS.length;
  const tripCount = DEMO_CATALOG_TRIPS.length;
  const totalCount = destCount + tripCount;

  console.log(`\n[CATALOG INVENTORY PREVIEW]`);
  console.log(`  Demo Destinations     : ${destCount} records`);
  DEMO_CATALOG_DESTINATIONS.forEach((d, idx) => {
    console.log(`    ${idx + 1}. [${d.id}] ${d.name} (${d.category}) — Starting at ${d.startingPrice}`);
  });

  console.log(`\n  Demo Trips Inventory  : ${tripCount} records (Flights, Trains, Buses)`);
  DEMO_CATALOG_TRIPS.forEach((t, idx) => {
    console.log(`    ${idx + 1}. [${t.id}] ${t.operator} ${t.code} — ${t.route} (${t.fareFormatted})`);
  });

  console.log(`\n  Total Inventory Items : ${totalCount} records`);
  console.log(`  Write Condition       : attribute_not_exists(id) [Strictly Idempotent]`);
  console.log(`  Overwrite Policy      : Overwrites strictly forbidden. Existing records preserved.`);

  // 3. Dry-Run / Preview Check
  if (!isConfirmed) {
    console.log('\n================================================================');
    console.log('  >>> DRY-RUN PREVIEW ONLY — ZERO AWS WRITES PERFORMED <<<      ');
    console.log('================================================================');
    console.log('To execute catalog seeding to DynamoDB, re-run with --confirm:');
    console.log('  node server/scripts/seedCatalog.js --confirm');
    console.log('  OR');
    console.log('  npm run seed:catalog -- --confirm\n');
    process.exit(0);
  }

  // 4. Execution Mode (Only when --confirm is present)
  console.log('\n================================================================');
  console.log('  CONFIRMED EXECUTION: Seeding demo inventory into DynamoDB...   ');
  console.log('================================================================\n');

  const repo = createRepository();

  const result = await repo.seedCatalogIfEmpty({
    onProgress: (evt) => {
      const typeLabel = evt.type === 'destination' ? 'Destination' : 'Trip       ';
      const statusLabel =
        evt.status === 'INSERTED'
          ? '✓ INSERTED'
          : evt.status === 'ALREADY_EXISTS'
          ? '· ALREADY EXISTS (Preserved)'
          : `✗ ERROR: ${evt.error}`;
      console.log(`  [${evt.index}/${evt.total}] ${typeLabel} ${evt.id.padEnd(26)} -> ${statusLabel}`);
    },
  });

  console.log('\n================================================================');
  console.log('  SEEDING SUMMARY REPORT                                        ');
  console.log('================================================================');
  console.log(`  Newly Inserted Records : ${result.seededCount}`);
  console.log(`  Pre-existing Records   : ${result.skippedCount} (untouched)`);
  console.log(`  Errors Encountered     : ${result.errors.length}`);
  console.log(`  Overall Status         : ${result.success ? 'SUCCESS' : 'COMPLETED WITH WARNINGS'}`);
  console.log('================================================================\n');

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n[UNHANDLED SCRIPT ERROR]', err.message);
  process.exit(1);
});
