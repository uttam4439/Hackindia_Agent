/**
 * server/evidenceService.js
 * Secure Evidence Ingestion and Validation Pipeline for Agent Travel.
 * Performs file size enforcement, magic byte header verification,
 * path-traversal prevention, and private file retrieval.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EVIDENCE_DIR = path.join(__dirname, 'data', 'evidence');

// Ensure evidence storage directory exists (guarded for read-only serverless runtimes)
try {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
} catch (err) {
  // Read-only filesystem (e.g. AWS Lambda /var/task)
  console.warn('[EVIDENCE SERVICE] Evidence directory cannot be initialized on disk (read-only runtime):', err.message);
}

// In-memory evidence metadata index
const evidenceIndex = new Map();

// Known Magic Byte Signatures
const MAGIC_BYTES = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47]), // .PNG
  jpeg: Buffer.from([0xff, 0xd8, 0xff]), // JPEG SOI marker
};

/**
 * Validates binary buffer headers against expected magic bytes.
 */
function validateMagicBytes(buffer, declaredType = '') {
  if (!buffer || buffer.length < 4) return { valid: false, error: 'File is empty or corrupt' };

  if (buffer.subarray(0, 4).equals(MAGIC_BYTES.pdf)) {
    return { valid: true, detectedType: 'application/pdf', ext: 'pdf' };
  }
  if (buffer.subarray(0, 4).equals(MAGIC_BYTES.png)) {
    return { valid: true, detectedType: 'image/png', ext: 'png' };
  }
  if (buffer.subarray(0, 3).equals(MAGIC_BYTES.jpeg)) {
    return { valid: true, detectedType: 'image/jpeg', ext: 'jpg' };
  }

  // Text/plain or JSON summary
  if (declaredType.includes('text') || declaredType.includes('json')) {
    return { valid: true, detectedType: 'text/plain', ext: 'txt' };
  }

  return { valid: false, error: 'Unsupported file format. Only PDF, PNG, and JPG documents are accepted.' };
}

/**
 * Sanitizes filenames to eliminate directory traversal risks.
 */
function sanitizeFilename(originalName) {
  const baseName = path.basename(originalName || 'evidence_doc');
  // Strip control chars, null bytes, and traversal indicators
  return baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export const evidenceService = {
  /**
   * Upload and validate a new evidence document.
   */
  saveEvidence(caseId, { filename, fileBase64, declaredType, uploaderEmail }) {
    if (!caseId) throw new Error('Case ID is required');
    if (!fileBase64) throw new Error('File payload is required');

    // Decode base64 payload to binary Buffer
    const buffer = Buffer.from(fileBase64, 'base64');

    // 1. File Size Verification (Max 10 MB = 10,485,760 bytes)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      throw new Error('File exceeds maximum allowable size of 10 MB');
    }
    if (buffer.length === 0) {
      throw new Error('File payload cannot be empty');
    }

    // 2. Magic Bytes Header Verification
    const magicCheck = validateMagicBytes(buffer, declaredType);
    if (!magicCheck.valid) {
      throw new Error(magicCheck.error);
    }

    // 3. Filename Sanitization & Path Isolation
    const cleanName = sanitizeFilename(filename || `doc_${Date.now()}.${magicCheck.ext}`);
    const fileId = `ev_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const safeDiskName = `${fileId}_${cleanName}`;

    const caseDir = path.join(EVIDENCE_DIR, sanitizeFilename(caseId));
    const filePath = path.join(caseDir, safeDiskName);

    // Guard against read-only serverless filesystem
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      throw new Error(
        'Document upload is unavailable in serverless demo mode. Persistent evidence storage requires dedicated S3 or object storage approval.'
      );
    }

    try {
      if (!fs.existsSync(caseDir)) {
        fs.mkdirSync(caseDir, { recursive: true });
      }
      fs.writeFileSync(filePath, buffer);
    } catch (fsErr) {
      if (fsErr.code === 'EROFS') {
        throw new Error(
          'Document upload is unavailable in serverless demo mode. Persistent evidence storage requires dedicated S3 or object storage approval.'
        );
      }
      throw fsErr;
    }

    const metadata = {
      fileId,
      caseId,
      filename: cleanName,
      diskName: safeDiskName,
      filePath,
      mimeType: magicCheck.detectedType,
      sizeBytes: buffer.length,
      sizeFormatted: `${(buffer.length / 1024).toFixed(1)} KB`,
      uploader: uploaderEmail || 'traveler',
      uploadedAt: new Date().toISOString(),
      verified: true,
    };

    if (!evidenceIndex.has(caseId)) {
      evidenceIndex.set(caseId, []);
    }
    evidenceIndex.get(caseId).push(metadata);

    return metadata;
  },

  /**
   * List verified evidence metadata for a case.
   */
  listEvidence(caseId) {
    return evidenceIndex.get(caseId) || [];
  },

  /**
   * Retrieve file buffer and metadata for authorized download.
   */
  getEvidenceFile(caseId, fileId) {
    const list = evidenceIndex.get(caseId) || [];
    const item = list.find((e) => e.fileId === fileId);
    if (!item) return null;

    if (!fs.existsSync(item.filePath)) return null;
    const content = fs.readFileSync(item.filePath);
    return {
      metadata: item,
      content,
    };
  },
};

export default evidenceService;
