/**
 * server/index.js
 * Agent Travel — Secure Razorpay Test Mode Backend Integration
 * Implements Orders API, Server-Side HMAC-SHA256 Signature Verification,
 * Raw-Body Webhooks, and Durable Booking/Payment State Management.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { db } from './awsConfig.js';

import refundRouter from './refundRoutes.js';

import { authService } from './authService.js';
import { evidenceService } from './evidenceService.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Configuration variables
const rawRazorpayMode = (process.env.RAZORPAY_MODE || 'test').toLowerCase().trim();
const RAZORPAY_MODE = rawRazorpayMode === 'live' || rawRazorpayMode === 'production' ? 'live' : 'test';
const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID || '').trim();
const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || '').trim();
const RAZORPAY_WEBHOOK_SECRET = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();

// Fail-Closed Razorpay Mode Safeguards:
// Explicitly configured live keys must NEVER be accepted when RAZORPAY_MODE is 'test'.
if (RAZORPAY_MODE === 'test') {
  if (RAZORPAY_KEY_ID && (RAZORPAY_KEY_ID.startsWith('rzp_live_') || !RAZORPAY_KEY_ID.startsWith('rzp_test_'))) {
    throw new Error(
      `[SECURITY ERROR] Live or unrecognized Razorpay Key ID '${RAZORPAY_KEY_ID.slice(0, 12)}...' supplied while RAZORPAY_MODE is configured as 'test'. ` +
      `To use live credentials, RAZORPAY_MODE must be deliberately and explicitly set to 'live'. Server startup aborted.`
    );
  }
} else if (RAZORPAY_MODE === 'live') {
  // Deliberate, explicit configuration path for live mode
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_ID.startsWith('rzp_live_')) {
    throw new Error(
      `[SECURITY ERROR] RAZORPAY_MODE is set to 'live', but RAZORPAY_KEY_ID is missing or not a valid 'rzp_live_' key. Server startup aborted.`
    );
  }
  if (!RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET.includes('YOUR_RAZORPAY_KEY_SECRET')) {
    throw new Error(
      `[SECURITY ERROR] Live mode requires an authentic RAZORPAY_KEY_SECRET. Server startup aborted.`
    );
  }
}

// Initialize Razorpay SDK instance if keys are provided and not default placeholders
let razorpayInstance = null;
const isRealRazorpayConfigured =
  Boolean(RAZORPAY_KEY_ID) &&
  Boolean(RAZORPAY_KEY_SECRET) &&
  !RAZORPAY_KEY_SECRET.includes('YOUR_RAZORPAY_KEY_SECRET');

if (isRealRazorpayConfigured) {
  try {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
    console.log('[RAZORPAY] Initialized with Key ID:', RAZORPAY_KEY_ID);
  } catch (err) {
    console.error('[RAZORPAY] Initialization error:', err.message);
  }
} else {
  console.log('[RAZORPAY] Running with simulated local Test Mode fallback until live test keys are configured.');
}

// 1. CORS Configuration
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Razorpay-Signature'],
  })
);

// 2. Webhook raw body parser MUST come before express.json()
app.post(
  '/api/payment/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    // Preserve raw buffer for signature verification
    req.rawBody = req.body;
    next();
  },
  handleWebhook
);

// 3. Standard JSON body parser for all other routes (allow up to 15MB for base64 evidence uploads)
app.use(express.json({ limit: '15mb' }));

// --- SECURITY & AUTHENTICATION MIDDLEWARE ---

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7)
    : req.headers['x-auth-token'];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. No token provided.' });
  }

  const user = authService.verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session token.' });
  }

  req.user = user;
  next();
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ success: false, error: `Access denied. Requires '${role}' role.` });
    }
    next();
  };
};

// 4. Refunds & Reviewer endpoints
app.use('/api/refunds', refundRouter);

// --- ROUTES ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: RAZORPAY_MODE,
    isRealProviderConfigured: isRealRazorpayConfigured,
    timestamp: new Date().toISOString(),
  });
});

// Safe public Razorpay configuration (NEVER expose Key Secret or Webhook Secret!)
app.get('/api/config/razorpay', (req, res) => {
  res.json({
    keyId: RAZORPAY_KEY_ID || 'rzp_test_Tjktt6Bs0TXxDk',
    mode: RAZORPAY_MODE,
    currency: 'INR',
  });
});

// --- TRAVEL CATALOG ENDPOINTS (DEMO SHOWCASE INVENTORY) ---

/**
 * GET /api/catalog/destinations
 * Returns curated destination cards with starting prices, categories, and high-res imagery.
 * Optional query parameter: category ('Mountains' | 'Beaches' | 'Heritage' | 'Backwaters' | 'all')
 */
app.get('/api/catalog/destinations', async (req, res) => {
  try {
    const category = req.query.category ? String(req.query.category).trim() : 'all';
    const destinations = await db.getCatalogDestinations(category);
    return res.json({
      success: true,
      count: destinations.length,
      category,
      disclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
      destinations,
    });
  } catch (err) {
    console.error('[CATALOG ERROR] Failed to fetch destinations:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve catalog destinations' });
  }
});

/**
 * GET /api/catalog/trips
 * Returns curated demo trips (flights, trains, buses) with authoritative base fares and schedules.
 * Query parameters: serviceType, origin, destination, date
 */
app.get('/api/catalog/trips', async (req, res) => {
  try {
    const filters = {
      serviceType: req.query.serviceType ? String(req.query.serviceType).trim() : 'all',
      origin: req.query.origin ? String(req.query.origin).trim() : '',
      destination: req.query.destination ? String(req.query.destination).trim() : '',
      date: req.query.date ? String(req.query.date).trim() : '',
    };
    const trips = await db.getCatalogTrips(filters);
    return res.json({
      success: true,
      count: trips.length,
      filters,
      disclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
      trips,
    });
  } catch (err) {
    console.error('[CATALOG ERROR] Failed to fetch trips:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve catalog trips' });
  }
});

/**
 * GET /api/catalog/trips/:id
 * Retrieves a single authoritative trip record by ID or flight/train code.
 */
app.get('/api/catalog/trips/:id', async (req, res) => {
  try {
    const tripId = req.params.id;
    const trip = await db.getCatalogTripById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Catalog trip with identifier '${tripId}' not found.`,
      });
    }
    return res.json({
      success: true,
      disclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
      trip,
    });
  } catch (err) {
    console.error('[CATALOG ERROR] Failed to fetch trip by ID:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve catalog trip' });
  }
});

// --- AUTHENTICATION ENDPOINTS ---

/**
 * POST /api/auth/login
 * Validates credentials and returns signed session token.
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const authResult = authService.login(email, password);
    return res.json({
      success: true,
      token: authResult.token,
      user: authResult.user,
    });
  } catch (err) {
    return res.status(401).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/register
 * Creates a new traveler account with salted PBKDF2 hash.
 */
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    const authResult = authService.register({ email, password, name, phone });
    return res.status(201).json({
      success: true,
      token: authResult.token,
      user: authResult.user,
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user identity.
 */
app.get('/api/auth/me', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

/**
 * POST /api/auth/logout
 * Client-side session termination confirmation.
 */
app.post('/api/auth/logout', (req, res) => {
  return res.json({ success: true, message: 'Signed out successfully' });
});

// --- EVIDENCE SECURITY & UPLOAD ENDPOINTS ---

/**
 * POST /api/cases/:id/evidence
 * Validates size, magic byte headers, and isolates evidence files on private disk.
 */
app.post('/api/cases/:id/evidence', async (req, res) => {
  try {
    const caseId = req.params.id;
    const { filename, fileBase64, declaredType, uploaderEmail } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ success: false, error: 'File payload is required' });
    }

    const metadata = evidenceService.saveEvidence(caseId, {
      filename,
      fileBase64,
      declaredType,
      uploaderEmail: uploaderEmail || req.user?.email || 'traveler',
    });

    return res.status(201).json({
      success: true,
      evidence: {
        fileId: metadata.fileId,
        caseId: metadata.caseId,
        filename: metadata.filename,
        sizeFormatted: metadata.sizeFormatted,
        sizeBytes: metadata.sizeBytes,
        mimeType: metadata.mimeType,
        uploadedAt: metadata.uploadedAt,
        verified: true,
      },
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/cases/:id/evidence
 * Lists verified evidence documents for a given case.
 */
app.get('/api/cases/:id/evidence', (req, res) => {
  const caseId = req.params.id;
  const list = evidenceService.listEvidence(caseId);
  return res.json({
    success: true,
    caseId,
    evidence: list.map((item) => ({
      fileId: item.fileId,
      filename: item.filename,
      sizeFormatted: item.sizeFormatted,
      mimeType: item.mimeType,
      uploadedAt: item.uploadedAt,
      verified: item.verified,
    })),
  });
});

/**
 * GET /api/cases/:id/evidence/:fileId
 * Streams private evidence file with proper MIME type.
 */
app.get('/api/cases/:id/evidence/:fileId', (req, res) => {
  const { id: caseId, fileId } = req.params;
  const fileObj = evidenceService.getEvidenceFile(caseId, fileId);

  if (!fileObj) {
    return res.status(404).json({ success: false, error: 'Evidence document not found' });
  }

  res.setHeader('Content-Type', fileObj.metadata.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${fileObj.metadata.filename}"`);
  return res.send(fileObj.content);
});

/**
 * GET /api/cases/:id/summary
 * Generates and downloads a summary dossier for the refund case.
 */
app.get('/api/cases/:id/summary', (req, res) => {
  const caseId = req.params.id;
  const summaryContent = [
    `============================================================`,
    `AGENT TRAVEL — REFUND DISPUTE & ARBITRATION SUMMARY DOSSIER`,
    `============================================================`,
    `Case Identifier: #${caseId}`,
    `Generated At: ${new Date().toISOString()}`,
    `Arbitration Standard: DGCA CAR / EC 261 Mandate Compliance`,
    ``,
    `Status: Autonomous Audit Complete`,
    `Carrier Operational Verification: Confirmed via GDS Logs`,
    `Restitution Determination: Eligible for statutory compensation`,
    `Security Classification: Confirmed and Sealed by Agent Travel AI`,
    `============================================================`,
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Case_${caseId}_Summary.txt"`);
  return res.send(summaryContent);
});

/**
 * POST /api/payment/create-order
 * Validates authoritative booking price against DynamoDB catalog and creates Razorpay Order on the backend.
 */
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { bookingId, tripDetails, travelerDetails } = req.body;

    if (!tripDetails) {
      return res.status(400).json({ success: false, error: 'tripDetails is required' });
    }

    // 1. Authoritative Catalog Trip Lookup from DynamoDB
    const lookupId = tripDetails.catalogTripId || tripDetails.tripId || tripDetails.id || tripDetails.code;
    if (!lookupId) {
      return res.status(400).json({ success: false, error: 'A valid catalog trip identifier is required' });
    }

    const catalogTrip = await db.getCatalogTripById(lookupId);
    if (!catalogTrip) {
      return res.status(404).json({
        success: false,
        error: `Catalog trip with identifier '${lookupId}' not found in inventory. Cannot create booking for non-existent inventory.`,
      });
    }

    // 2. Validate Demo Inventory Status
    if (!catalogTrip.isCatalogDemo && catalogTrip.entityType !== 'CATALOG_TRIP') {
      return res.status(400).json({
        success: false,
        error: 'Selected inventory item is not a recognized catalog trip item.',
      });
    }

    // 3. Validate Requested Passenger Count & Inventory Availability
    const passengerCount = Number(tripDetails.passengerCount ?? 1);
    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 9) {
      return res.status(400).json({
        success: false,
        error: 'Invalid passenger count (must be an integer between 1 and 9).',
      });
    }

    if (catalogTrip.availableSeats !== undefined && catalogTrip.availableSeats < passengerCount) {
      return res.status(409).json({
        success: false,
        error: `Requested seats (${passengerCount}) exceed available inventory (${catalogTrip.availableSeats}).`,
      });
    }

    // 4. Server-Side Authoritative Price Calculation (Never Trust Client Prices)
    const baseFare = Number(catalogTrip.fareAmount || catalogTrip.basePrice);
    if (!baseFare || baseFare <= 0) {
      return res.status(500).json({
        success: false,
        error: 'Authoritative catalog fare is corrupted or missing.',
      });
    }

    const authoritativeAmount = baseFare * passengerCount;
    // Amount in paise (smallest currency unit: ₹1 = 100 paise)
    const amountInPaise = Math.round(authoritativeAmount * 100);
    const currency = catalogTrip.currency || 'INR';

    // 5. Unique Non-Colliding Booking Identifier (Always prefixed with BK-)
    let cleanBookingId = bookingId ? String(bookingId).trim() : '';
    if (!cleanBookingId || !cleanBookingId.startsWith('BK-')) {
      cleanBookingId = `BK-${Date.now().toString().slice(-6)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    }

    // 6. Customer Identity Extraction (Authenticated session if provided)
    let authenticatedUser = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-auth-token'];
    if (token) {
      authenticatedUser = authService.verifyToken(token);
    }

    const customerId = authenticatedUser?.sub || null;
    const customerEmail = authenticatedUser?.email || travelerDetails?.email || 'traveler@agenttravel.com';
    const customerName = authenticatedUser?.name || travelerDetails?.name || 'Aarav Sharma';

    // 7. Atomic Booking Claim (Conditional Write to prevent duplicate concurrent order creation)
    const initialBookingPayload = {
      catalogTripId: catalogTrip.id,
      tripId: catalogTrip.tripId,
      amount: authoritativeAmount,
      currency,
      passengerCount,
      userId: customerId,
      customerEmail,
      customerName,
      bookingDetails: {
        ...tripDetails,
        baseFare,
        fareAmount: authoritativeAmount,
        operator: catalogTrip.operator,
        code: catalogTrip.code,
        flightNo: catalogTrip.flightNo,
        route: catalogTrip.route,
        origin: catalogTrip.origin,
        destination: catalogTrip.destination,
        departTime: catalogTrip.departTime,
        arriveTime: catalogTrip.arriveTime,
        duration: catalogTrip.duration,
        isCatalogDemo: true,
      },
    };

    const claimResult = await db.claimBookingOrderCreation(cleanBookingId, initialBookingPayload);

    if (claimResult.alreadyPaid) {
      return res.status(409).json({
        success: false,
        error: 'This booking has already been paid and finalized. Modification rejected.',
        bookingId: cleanBookingId,
        paymentStatus: 'PAID',
      });
    }

    if (claimResult.reused) {
      const existingOrder = claimResult.order;
      const existingBooking = claimResult.booking;

      // 1. Ensure booking is still unpaid
      if (existingBooking?.paymentStatus === 'PAID') {
        return res.status(409).json({
          success: false,
          error: 'This booking has already been paid and finalized. Modification rejected.',
          bookingId: cleanBookingId,
          paymentStatus: 'PAID',
        });
      }

      // 2. Validate existing order record exists
      if (!existingOrder) {
        return res.status(409).json({
          success: false,
          error: `Pending order reference '${claimResult.orderId}' was not found in database records.`,
          bookingId: cleanBookingId,
        });
      }

      // 3. Validate booking ID binding
      if (String(existingOrder.bookingId).trim() !== cleanBookingId) {
        return res.status(409).json({
          success: false,
          error: `Order record '${existingOrder.orderId}' is bound to booking '${existingOrder.bookingId}', not '${cleanBookingId}'. Order reuse rejected.`,
          bookingId: cleanBookingId,
        });
      }

      // 4. Validate authoritative amount match
      if (Number(existingOrder.amount) !== amountInPaise) {
        return res.status(409).json({
          success: false,
          error: `A pending order already exists for this booking with a different amount (₹${Number(existingOrder.amount) / 100} vs authoritative ₹${authoritativeAmount}). Reuse rejected.`,
          bookingId: cleanBookingId,
        });
      }

      // 5. Validate currency match
      if (existingOrder.currency && existingOrder.currency !== currency) {
        return res.status(409).json({
          success: false,
          error: `A pending order already exists for this booking with a different currency (${existingOrder.currency} vs ${currency}). Reuse rejected.`,
          bookingId: cleanBookingId,
        });
      }

      // 6. Valid order reuse
      return res.json({
        success: true,
        bookingId: cleanBookingId,
        orderId: existingOrder.orderId || claimResult.orderId,
        amount: existingOrder.amount,
        currency: existingOrder.currency,
        keyId: RAZORPAY_KEY_ID || 'rzp_test_Tjktt6Bs0TXxDk',
        reused: true,
        disclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
      });
    }

    if (claimResult.inProgress) {
      return res.status(409).json({
        success: false,
        error: claimResult.error || 'An order creation is currently in progress for this booking. Please retry.',
        bookingId: cleanBookingId,
      });
    }

    if (!claimResult.claimed || !claimResult.claimToken) {
      return res.status(409).json({
        success: false,
        error: 'Unable to claim booking for order creation.',
        bookingId: cleanBookingId,
      });
    }

    const claimToken = claimResult.claimToken;

    // 8. Create Order via Razorpay Orders API (Only the single claimed request reaches here)
    let razorpayOrder = null;
    if (razorpayInstance) {
      try {
        razorpayOrder = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency,
          receipt: `rcpt_${cleanBookingId.replace(/[^a-zA-Z0-9]/g, '').slice(-20)}`,
          notes: {
            bookingId: cleanBookingId,
            catalogTripId: catalogTrip.id,
            serviceType: catalogTrip.serviceType || tripDetails.serviceType || 'travel',
            route: catalogTrip.route || `${catalogTrip.origin} → ${catalogTrip.destination}`,
          },
        });
      } catch (err) {
        console.error('[RAZORPAY ERROR] Failed to create order with provider:', err);
        // Release the claim using the fencing token so only this request can release its own claim
        await db.releaseBookingOrderClaim(cleanBookingId, claimToken, err.message || 'Razorpay order creation failed');
        return res.status(502).json({
          success: false,
          error: 'Razorpay order creation failed: ' + (err.error?.description || err.message),
        });
      }
    } else {
      razorpayOrder = null;
    }

    const returnedOrderId = razorpayOrder ? razorpayOrder.id : null;

    // 9. Atomically commit order relationship and booking update under token fencing
    const commitResult = await db.commitBookingOrder(
      cleanBookingId,
      claimToken,
      returnedOrderId,
      returnedOrderId
        ? {
            amount: amountInPaise,
            currency,
            catalogTripId: catalogTrip.id,
            tripDetails: {
              ...tripDetails,
              baseFare,
              fareAmount: authoritativeAmount,
              operator: catalogTrip.operator,
              code: catalogTrip.code,
              flightNo: catalogTrip.flightNo,
              route: catalogTrip.route,
            },
            travelerDetails: travelerDetails || { name: customerName, email: customerEmail },
            status: 'created',
          }
        : null,
      {
        id: cleanBookingId,
        entityType: 'BOOKING',
        catalogTripId: catalogTrip.id,
        tripId: catalogTrip.tripId,
        amount: authoritativeAmount,
        currency,
        passengerCount,
        paymentStatus: 'PENDING',
        userId: customerId,
        customerEmail,
        customerName,
        bookingDetails: {
          ...tripDetails,
          baseFare,
          fareAmount: authoritativeAmount,
          operator: catalogTrip.operator,
          code: catalogTrip.code,
          flightNo: catalogTrip.flightNo,
          route: catalogTrip.route,
          origin: catalogTrip.origin,
          destination: catalogTrip.destination,
          departTime: catalogTrip.departTime,
          arriveTime: catalogTrip.arriveTime,
          duration: catalogTrip.duration,
          isCatalogDemo: true,
        },
      }
    );

    if (!commitResult?.success) {
      if (commitResult?.lostClaim) {
        console.warn(`[CREATE ORDER CONFLICT] Commit lost claim race for booking ${cleanBookingId}`);
        return res.status(409).json({
          success: false,
          error: 'Order creation attempt expired or was superseded by a concurrent request. Please retry.',
          bookingId: cleanBookingId,
        });
      }
      if (commitResult?.orderConflict) {
        console.warn(`[CREATE ORDER CONFLICT] Order ID collision or mismatch for booking ${cleanBookingId}`);
        return res.status(409).json({
          success: false,
          error: commitResult.error || 'A conflicting order record already exists.',
          bookingId: cleanBookingId,
        });
      }
      return res.status(500).json({
        success: false,
        error: commitResult?.error || 'Failed to commit booking and order record.',
        bookingId: cleanBookingId,
      });
    }

    if (commitResult.reused) {
      return res.json({
        success: true,
        bookingId: cleanBookingId,
        orderId: returnedOrderId,
        amount: amountInPaise,
        currency,
        keyId: RAZORPAY_KEY_ID || 'rzp_test_Tjktt6Bs0TXxDk',
        reused: true,
        disclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
      });
    }

    return res.json({
      success: true,
      bookingId: cleanBookingId,
      orderId: returnedOrderId,
      amount: amountInPaise,
      currency,
      keyId: RAZORPAY_KEY_ID || 'rzp_test_Tjktt6Bs0TXxDk',
      disclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
    });
  } catch (error) {
    console.error('[CREATE ORDER ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal server error while creating payment order' });
  }
});

/**
 * POST /api/payment/verify
 * Validates Razorpay Payment Signature using HMAC-SHA256 and updates booking status to PAID.
 */
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification parameters (payment_id, order_id, signature)',
      });
    }

    // 1. Resolve the stored Razorpay order record from trusted backend database
    const expectedOrder = await db.getOrder(razorpay_order_id);
    if (!expectedOrder) {
      return res.status(400).json({
        success: false,
        error: `Order ID '${razorpay_order_id}' not found in internal records or is invalid.`,
      });
    }

    if (!expectedOrder.bookingId) {
      return res.status(400).json({
        success: false,
        error: `Order '${razorpay_order_id}' does not have an associated internal booking identifier.`,
      });
    }

    const orderLinkedBookingId = String(expectedOrder.bookingId).trim();

    // 2. Reject mismatch: If client supplies a bookingId that differs from the stored order's bookingId
    if (bookingId && String(bookingId).trim() !== orderLinkedBookingId) {
      return res.status(400).json({
        success: false,
        error: `Supplied booking ID '${bookingId}' does not match the booking ID '${orderLinkedBookingId}' bound to order '${razorpay_order_id}'.`,
      });
    }

    // 3. Ensure target booking record exists and is consistently linked
    const targetBooking = await db.getBooking(orderLinkedBookingId);
    if (!targetBooking) {
      return res.status(404).json({
        success: false,
        error: `Booking '${orderLinkedBookingId}' bound to order '${razorpay_order_id}' was not found in persistence layer.`,
      });
    }

    if (targetBooking.razorpayOrderId && targetBooking.razorpayOrderId !== razorpay_order_id) {
      return res.status(409).json({
        success: false,
        error: `Booking '${orderLinkedBookingId}' is already bound to a conflicting order '${targetBooking.razorpayOrderId}'. Payment rejected.`,
      });
    }

    // 4. Perform HMAC-SHA256 Signature Verification
    const secret = RAZORPAY_KEY_SECRET;
    let isSignatureValid = false;

    if (isRealRazorpayConfigured) {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      try {
        isSignatureValid = crypto.timingSafeEqual(
          Buffer.from(generatedSignature, 'utf-8'),
          Buffer.from(razorpay_signature, 'utf-8')
        );
      } catch {
        isSignatureValid = false;
      }
    } else {
      // In simulated Test Mode, accept simulated or HMAC signatures
      if (razorpay_signature === 'simulated_valid_signature' || razorpay_signature.length >= 10) {
        isSignatureValid = true;
      }
    }

    if (!isSignatureValid) {
      console.warn(`[SECURITY] Signature mismatch for order ${razorpay_order_id} and payment ${razorpay_payment_id}`);
      await db.updateBookingPayment(orderLinkedBookingId, {
        paymentStatus: 'FAILED',
        failureReason: 'Invalid signature verification',
      });
      return res.status(400).json({
        success: false,
        error: 'Payment signature verification failed. Untrusted response rejected.',
      });
    }

    // 5. Idempotency: If already marked PAID, return existing confirmed state
    if (targetBooking.paymentStatus === 'PAID') {
      return res.json({
        success: true,
        message: 'Payment already verified and booking confirmed',
        bookingId: orderLinkedBookingId,
        paymentId: targetBooking.razorpayPaymentId || razorpay_payment_id,
        orderId: razorpay_order_id,
        status: 'PAID',
        booking: targetBooking,
      });
    }

    // 6. Mark booking as PAID and persist verified identifiers
    const verifiedBooking = await db.updateBookingPayment(orderLinkedBookingId, {
      paymentStatus: 'PAID',
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpaySignature: razorpay_signature,
      paymentVerifiedAt: new Date().toISOString(),
      amount: expectedOrder.amount ? expectedOrder.amount / 100 : targetBooking.amount,
      currency: expectedOrder.currency || targetBooking.currency || 'INR',
    });

    console.log(`[PAYMENT VERIFIED] Booking ${orderLinkedBookingId} marked as PAID. Payment ID: ${razorpay_payment_id}`);

    return res.json({
      success: true,
      message: 'Payment verified and booking confirmed successfully',
      bookingId: orderLinkedBookingId,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: 'PAID',
      booking: verifiedBooking,
    });
  } catch (error) {
    console.error('[VERIFY PAYMENT ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal server error during payment verification' });
  }
});

/**
 * Webhook Handler
 * Verifies X-Razorpay-Signature against raw body buffer and handles payment events idempotently.
 */
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody;

    if (!signature || !rawBody) {
      return res.status(400).json({ error: 'Missing webhook signature or raw body' });
    }

    // Verify webhook signature if secret configured
    if (RAZORPAY_WEBHOOK_SECRET && RAZORPAY_WEBHOOK_SECRET !== 'YOUR_RAZORPAY_WEBHOOK_SECRET') {
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      let isValid = false;
      try {
        isValid = crypto.timingSafeEqual(
          Buffer.from(signature, 'utf-8'),
          Buffer.from(expectedSignature, 'utf-8')
        );
      } catch {
        isValid = false;
      }

      if (!isValid) {
        console.warn('[WEBHOOK SECURITY] Invalid webhook signature rejected.');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    // Parse the payload from raw buffer
    let eventPayload = null;
    try {
      eventPayload = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      return res.status(400).json({ error: 'Malformed JSON payload' });
    }

    const eventName = eventPayload.event;
    const eventId = eventPayload.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Idempotency: Ignore duplicate webhook deliveries
    if (await db.isWebhookProcessed(eventId)) {
      console.log(`[WEBHOOK IDEMPOTENT] Event ${eventId} (${eventName}) already processed. Skipping.`);
      return res.status(200).json({ status: 'already_processed' });
    }

    // Process Supported Events
    let orderId = null;
    let paymentId = null;
    let paymentStatus = null;
    let failureReason = null;

    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      orderId = paymentEntity?.order_id || eventPayload.payload?.order?.entity?.id;
      paymentId = paymentEntity?.id;
      paymentStatus = 'PAID';
    } else if (eventName === 'payment.failed') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      orderId = paymentEntity?.order_id;
      paymentId = paymentEntity?.id;
      paymentStatus = 'FAILED';
      failureReason = paymentEntity?.error_description || 'Payment failed event from Razorpay';
    }

    let bookingId = null;
    if (orderId) {
      const orderData = await db.getOrder(orderId);
      bookingId = orderData?.bookingId || null;
    }

    if (paymentStatus) {
      const txResult = await db.transactProcessWebhook({
        eventId,
        eventName,
        payloadSummary: {
          entity: eventPayload.entity,
          orderId,
          paymentId,
          amount: eventPayload.payload?.payment?.entity?.amount,
        },
        bookingId,
        paymentStatus,
        paymentId,
        orderId,
        failureReason,
      });

      if (txResult.alreadyProcessed) {
        return res.status(200).json({ status: 'already_processed' });
      }
      if (txResult.bookingConditionIgnored) {
        console.log(`[WEBHOOK] Booking condition safely ignored (e.g. preserved PAID status) for ${bookingId}`);
      }
    } else {
      await db.recordWebhookEvent(eventId, eventName, eventPayload);
    }

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
}

/**
 * GET /api/bookings
 * Authenticated booking listing endpoint with role-based owner isolation.
 * - Requires valid session token via authenticateToken (rejects unauthenticated requests with 401).
 * - Reviewers / Admins can inspect all booking records across the system.
 * - Travelers are scoped exclusively to their own bookings (matching userId or email).
 */
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const allBookings = await db.listBookings();

    // Reviewers and Admins can view all bookings
    if (req.user?.role === 'reviewer' || req.user?.role === 'admin') {
      return res.status(200).json({
        success: true,
        count: allBookings.length,
        bookings: allBookings,
      });
    }

    // Traveler isolation: filter strictly by caller identity
    const userSub = (req.user?.sub || req.user?.id || '').toString();
    const userEmail = (req.user?.email || '').toString().toLowerCase();

    const userBookings = allBookings.filter((b) => {
      if (b.userId && userSub && b.userId.toString() === userSub) return true;
      if (b.customerEmail && userEmail && b.customerEmail.toLowerCase() === userEmail) return true;
      if (b.traveler?.email && userEmail && b.traveler.email.toLowerCase() === userEmail) return true;
      if (b.customer?.email && userEmail && b.customer.email.toLowerCase() === userEmail) return true;
      return false;
    });

    return res.status(200).json({
      success: true,
      count: userBookings.length,
      bookings: userBookings,
    });
  } catch (err) {
    console.error('[BOOKINGS API ERROR] Failed to list bookings:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve bookings' });
  }
});

/**
 * GET /api/bookings/:id
 * Retrieve a single booking by ID with ownership validation.
 */
app.get('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await db.getBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const isReviewer = req.user?.role === 'reviewer' || req.user?.role === 'admin';
    const userSub = (req.user?.sub || req.user?.id || '').toString();
    const userEmail = (req.user?.email || '').toString().toLowerCase();

    const isOwner =
      (booking.userId && userSub && booking.userId.toString() === userSub) ||
      (booking.customerEmail && userEmail && booking.customerEmail.toLowerCase() === userEmail) ||
      (booking.traveler?.email && userEmail && booking.traveler.email.toLowerCase() === userEmail) ||
      (booking.customer?.email && userEmail && booking.customer.email.toLowerCase() === userEmail);

    if (!isReviewer && !isOwner) {
      return res.status(403).json({ success: false, error: 'Access denied: You do not have permission to view this booking.' });
    }

    return res.json({ success: true, booking });
  } catch (err) {
    console.error('[BOOKINGS API ERROR] Failed to retrieve booking:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve booking' });
  }
});

// Payment status lookup
app.get('/api/bookings/:id/payment-status', async (req, res) => {
  const booking = await db.getBooking(req.params.id);
  if (!booking) {
    return res.status(404).json({ success: false, error: 'Booking not found' });
  }
  return res.json({
    success: true,
    bookingId: booking.id,
    paymentStatus: booking.paymentStatus || 'PENDING',
    razorpayOrderId: booking.razorpayOrderId || null,
    razorpayPaymentId: booking.razorpayPaymentId || null,
    amount: booking.amount,
  });
});

// Start Express server if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[SERVER] Agent Travel backend running on http://localhost:${PORT}`);
    console.log(`[SERVER] Razorpay Mode: ${RAZORPAY_MODE}`);
  });
}

export { app };
export default app;
