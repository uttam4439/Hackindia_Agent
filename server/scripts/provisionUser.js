/**
 * server/scripts/provisionUser.js
 * Administrative Reviewer & Staff Provisioning Utility for Agent Travel.
 *
 * Guarantees:
 * 1. Strictly administrative: not exposed via public HTTP endpoints.
 * 2. Safe by default: runs in PREVIEW (dry-run) mode unless '--confirm' is supplied.
 * 3. Enforces cryptographic password hashing (PBKDF2-SHA512) and salt generation.
 * 4. Strictly validates roles ('reviewer', 'admin', 'traveler').
 * 5. Validates minimum password complexity (>= 8 characters).
 * 6. Never logs plain passwords or secret keys.
 * 7. Enforces atomic conditional writes to prevent overwriting existing accounts.
 */

import dotenv from 'dotenv';
import { db } from '../awsConfig.js';
import { authService } from '../authService.js';

dotenv.config();

function getArgValue(args, flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith('-')) {
    return args[idx + 1];
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const isConfirmed = args.includes('--confirm');
  const isHelp = args.includes('--help') || args.includes('-h');

  console.log('================================================================');
  console.log('  AGENT TRAVEL — ADMINISTRATIVE USER PROVISIONING UTILITY       ');
  console.log('================================================================');

  if (isHelp) {
    console.log(`
Usage:
  node server/scripts/provisionUser.js --email <email> --name <name> --password <password> [options]

Options:
  --email <email>        User email address (required).
  --name <name>          Full name (required).
  --password <password>  Account password, minimum 8 characters (required).
  --role <role>          Account role: 'reviewer', 'admin', or 'traveler' (default: reviewer).
  --phone <phone>        Contact phone number (optional).
  --confirm              Explicitly execute persistent write. Without this flag,
                         runs in safe PREVIEW (dry-run) mode.
  --help, -h             Show this help screen.

Examples:
  Preview (Dry-run):
    node server/scripts/provisionUser.js --email lead.auditor@agenttravel.com --name "Julian Hayes" --password "SecurePass@2026" --role reviewer

  Confirmed Execution:
    node server/scripts/provisionUser.js --email lead.auditor@agenttravel.com --name "Julian Hayes" --password "SecurePass@2026" --role reviewer --confirm
`);
    process.exit(0);
  }

  const email = getArgValue(args, '--email');
  const name = getArgValue(args, '--name');
  const password = getArgValue(args, '--password');
  const role = getArgValue(args, '--role') || 'reviewer';
  const phone = getArgValue(args, '--phone') || '';

  if (!email || !name || !password) {
    console.error('\n[VALIDATION ERROR] Missing required arguments: --email, --name, and --password are required.');
    console.error('Run with --help to view usage details.\n');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const validRoles = ['reviewer', 'admin', 'traveler'];
  if (!validRoles.includes(role)) {
    console.error(`\n[VALIDATION ERROR] Invalid role '${role}'. Must be one of: ${validRoles.join(', ')}\n`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('\n[VALIDATION ERROR] Password must be at least 8 characters long for administrative provisioning.\n');
    process.exit(1);
  }

  console.log('\n[PROVISIONING TARGET]');
  console.log(`  Target Email : ${normalizedEmail}`);
  console.log(`  Full Name    : ${name.trim()}`);
  console.log(`  Role         : ${role}`);
  console.log(`  Phone        : ${phone.trim() || '(none)'}`);
  console.log(`  Password     : [PROTECTED — ${password.length} characters]`);

  if (!isConfirmed) {
    console.log('\n================================================================');
    console.log('  >>> DRY-RUN PREVIEW ONLY — ZERO DATABASE WRITES PERFORMED <<<  ');
    console.log('================================================================');
    console.log('To execute account creation in persistent storage, re-run with --confirm:');
    console.log(`  node server/scripts/provisionUser.js --email ${normalizedEmail} --name "${name}" --password "********" --role ${role} --confirm\n`);
    process.exit(0);
  }

  console.log('\n[EXECUTION] Creating persistent user record...');
  try {
    const result = await authService.provisionUser({
      email: normalizedEmail,
      name: name.trim(),
      password,
      role,
      phone: phone.trim(),
    });

    console.log('\n================================================================');
    console.log('  PROVISIONING SUCCESSFUL                                       ');
    console.log('================================================================');
    console.log(`  User ID      : ${result.user.id}`);
    console.log(`  Email        : ${result.user.email}`);
    console.log(`  Name         : ${result.user.name}`);
    console.log(`  Role         : ${result.user.role}`);
    console.log(`  Status       : Active and authorized for immediate sign-in.`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n[FATAL ERROR] Provisioning failed:', err.message, '\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n[UNHANDLED ERROR]', err.message);
  process.exit(1);
});
