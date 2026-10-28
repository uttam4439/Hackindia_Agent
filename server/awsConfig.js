/**
 * server/awsConfig.js
 * Database & Persistence Layer for Agent Travel.
 * Provides resilient persistence for Bookings, Orders, Payments, Webhook Audit Logs,
 * Refund Cases, and Reviewer Decisions using Amazon DynamoDB in ap-southeast-2.
 * Includes an isolated in-memory repository for unit and automated testing.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DATA_DIR = path.join(__dirname, 'data');
export const DATA_FILE = path.join(DATA_DIR, 'store.json');

export const REGION = process.env.AWS_REGION || 'ap-southeast-2';
export const BOOKINGS_TABLE = process.env.DYNAMODB_TABLE_BOOKINGS || 'AgentTravelBookings';
export const CASES_TABLE = process.env.DYNAMODB_TABLE_CASES || 'AgentTravelCases';

export const isRealStore = (file) => Boolean(file && path.resolve(file) === path.resolve(DATA_FILE));

/**
 * Recognized Finalized Refund Statuses that are immutable.
 */
export const FINALIZED_REFUND_STATUSES = ['Approved', 'Disbursed', 'Rejected'];
export const isFinalizedRefundStatus = (status) =>
  Boolean(status && FINALIZED_REFUND_STATUSES.some((s) => s.toLowerCase() === status.toString().trim().toLowerCase()));

/**
 * Safe cleanup helper that verifies resolved paths against real development store.
 */
export const safeCleanup = (targetPath) => {
  if (!targetPath) return;
  const resolvedTarget = path.resolve(targetPath);
  const resolvedReal = path.resolve(DATA_FILE);
  const resolvedRealTmp = path.resolve(`${DATA_FILE}.tmp`);

  // SAFETY: Never delete the real development store or its temporary write-swap file
  if (resolvedTarget === resolvedReal || resolvedTarget === resolvedRealTmp) {
    console.warn('[DB SAFETY] Blocked attempt to delete real store.json or store.json.tmp');
    return;
  }
  try {
    if (fs.existsSync(resolvedTarget)) {
      fs.unlinkSync(resolvedTarget);
    }
    const tmp = `${resolvedTarget}.tmp`;
    if (fs.existsSync(tmp) && path.resolve(tmp) !== resolvedReal && path.resolve(tmp) !== resolvedRealTmp) {
      fs.unlinkSync(tmp);
    }
  } catch (err) {
    console.warn('[DB SAFETY] Error during safeCleanup:', err.message);
  }
};

/**
 * Authoritative Curated Demo Catalog for Showcase.
 * Strictly labeled as demo showcase inventory — NOT live airline/GDS feeds.
 */
export const DEMO_CATALOG_DESTINATIONS = [
  {
    id: 'dest#kashmir',
    entityType: 'CATALOG_DESTINATION',
    destinationId: 'kashmir',
    name: 'Kashmir',
    category: 'Mountains',
    tags: 'Lakes · Scenic views',
    bestTime: 'Sep – Nov & Apr – Jun',
    startingPrice: '₹ 4,899',
    basePrice: 4899,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=800&q=80',
    description: 'Breathtaking valleys, serene Dal lake shikara rides, snow peaks, and saffron gardens.',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'dest#goa',
    entityType: 'CATALOG_DESTINATION',
    destinationId: 'goa',
    name: 'Goa',
    category: 'Beaches',
    tags: 'Nightlife · Coastline',
    bestTime: 'Nov – Feb',
    startingPrice: '₹ 3,450',
    basePrice: 3450,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
    description: 'Golden sandy shores, Portuguese heritage villas, vibrant beach shacks, and water sports.',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'dest#manali',
    entityType: 'CATALOG_DESTINATION',
    destinationId: 'manali',
    name: 'Manali',
    category: 'Mountains',
    tags: 'Adventure · Snow',
    bestTime: 'Oct – Feb & Mar – Jun',
    startingPrice: '₹ 3,999',
    basePrice: 3999,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
    description: 'High altitude Himalayan slopes, Solang adventure valley, and Rohtang Pass glaciers.',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'dest#jaipur',
    entityType: 'CATALOG_DESTINATION',
    destinationId: 'jaipur',
    name: 'Jaipur',
    category: 'Heritage',
    tags: 'Palaces · Forts',
    bestTime: 'Oct – Mar',
    startingPrice: '₹ 2,850',
    basePrice: 2850,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80',
    description: 'The Pink City with magnificent Amber Fort, Hawa Mahal, and royal Rajasthani heritage.',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'dest#kerala',
    entityType: 'CATALOG_DESTINATION',
    destinationId: 'kerala',
    name: 'Kerala (Alleppey)',
    category: 'Backwaters',
    tags: 'Houseboats · Nature',
    bestTime: 'Sep – Mar',
    startingPrice: '₹ 4,200',
    basePrice: 4200,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
    description: 'Palm-fringed lagoons, tranquil traditional kettuvallam houseboats, and Ayurvedic retreats.',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'dest#varanasi',
    entityType: 'CATALOG_DESTINATION',
    destinationId: 'varanasi',
    name: 'Varanasi',
    category: 'Spiritual',
    tags: 'Ghats · Ganga Aarti',
    bestTime: 'Oct – Mar',
    startingPrice: '₹ 2,990',
    basePrice: 2990,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
    description: 'Ancient sacred ghats along the holy river Ganges, evening Grand Aarti, and timeless spirituality.',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'dest#dubai',
    entityType: 'CATALOG_DESTINATION',
    destinationId: 'dubai',
    name: 'Dubai',
    category: 'International',
    tags: 'Skylines · Desert Safari',
    bestTime: 'Nov – Mar',
    startingPrice: '₹ 18,500',
    basePrice: 18500,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
    description: 'Futuristic architecture, Burj Khalifa vistas, luxury shopping, and desert dune adventures.',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'dest#shimla',
    entityType: 'CATALOG_DESTINATION',
    destinationId: 'shimla',
    name: 'Shimla',
    category: 'Mountains',
    tags: 'Colonial · Pine Hills',
    bestTime: 'Mar – Jun & Dec – Jan',
    startingPrice: '₹ 3,600',
    basePrice: 3600,
    currency: 'INR',
    image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80',
    description: 'Historic British summer capital, Mall Road strolls, Jakhoo Temple, and cedar-clad ridges.',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
];

export const DEMO_CATALOG_TRIPS = [
  {
    id: 'trip#flights#AI-805',
    entityType: 'CATALOG_TRIP',
    tripId: 'AI-805',
    serviceType: 'flights',
    operator: 'Air India',
    code: 'AI-805',
    flightNo: 'AI-805',
    route: 'Delhi (DEL) → Mumbai (BOM)',
    origin: 'Delhi (DEL)',
    destination: 'Mumbai (BOM)',
    departTime: '06:10',
    arriveTime: '08:25',
    duration: '2h 15m',
    stops: 'Non-stop',
    travelClass: 'Economy Flex',
    basePrice: 4872,
    fareAmount: 4872,
    fareFormatted: '₹ 4,872',
    currency: 'INR',
    availableSeats: 32,
    refundable: true,
    logo: 'flight_takeoff',
    imageUrl: 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=800&q=80',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'trip#flights#6E-2134',
    entityType: 'CATALOG_TRIP',
    tripId: '6E-2134',
    serviceType: 'flights',
    operator: 'IndiGo',
    code: '6E-2134',
    flightNo: '6E-2134',
    route: 'Delhi (DEL) → Mumbai (BOM)',
    origin: 'Delhi (DEL)',
    destination: 'Mumbai (BOM)',
    departTime: '08:30',
    arriveTime: '10:40',
    duration: '2h 10m',
    stops: 'Non-stop',
    travelClass: 'Economy Standard',
    basePrice: 5120,
    fareAmount: 5120,
    fareFormatted: '₹ 5,120',
    currency: 'INR',
    availableSeats: 45,
    refundable: true,
    logo: 'flight_takeoff',
    imageUrl: 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=800&q=80',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'trip#flights#UK-992',
    entityType: 'CATALOG_TRIP',
    tripId: 'UK-992',
    serviceType: 'flights',
    operator: 'Vistara',
    code: 'UK-992',
    flightNo: 'UK-992',
    route: 'Delhi (DEL) → Mumbai (BOM)',
    origin: 'Delhi (DEL)',
    destination: 'Mumbai (BOM)',
    departTime: '10:15',
    arriveTime: '12:35',
    duration: '2h 20m',
    stops: 'Non-stop',
    travelClass: 'Premium Economy',
    basePrice: 5490,
    fareAmount: 5490,
    fareFormatted: '₹ 5,490',
    currency: 'INR',
    availableSeats: 18,
    refundable: true,
    logo: 'flight_takeoff',
    imageUrl: 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=800&q=80',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'trip#flights#SG-101',
    entityType: 'CATALOG_TRIP',
    tripId: 'SG-101',
    serviceType: 'flights',
    operator: 'SpiceJet',
    code: 'SG-101',
    flightNo: 'SG-101',
    route: 'Delhi (DEL) → Srinagar (SXR)',
    origin: 'Delhi (DEL)',
    destination: 'Srinagar (SXR)',
    departTime: '07:20',
    arriveTime: '09:05',
    duration: '1h 45m',
    stops: 'Non-stop',
    travelClass: 'Economy Saver',
    basePrice: 4899,
    fareAmount: 4899,
    fareFormatted: '₹ 4,899',
    currency: 'INR',
    availableSeats: 24,
    refundable: true,
    logo: 'flight_takeoff',
    imageUrl: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=800&q=80',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'trip#flights#6E-551',
    entityType: 'CATALOG_TRIP',
    tripId: '6E-551',
    serviceType: 'flights',
    operator: 'IndiGo',
    code: '6E-551',
    flightNo: '6E-551',
    route: 'Delhi (DEL) → Goa (GOI)',
    origin: 'Delhi (DEL)',
    destination: 'Goa (GOI)',
    departTime: '11:40',
    arriveTime: '14:15',
    duration: '2h 35m',
    stops: 'Non-stop',
    travelClass: 'Economy Flex',
    basePrice: 5280,
    fareAmount: 5280,
    fareFormatted: '₹ 5,280',
    currency: 'INR',
    availableSeats: 30,
    refundable: true,
    logo: 'flight_takeoff',
    imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'trip#trains#12004',
    entityType: 'CATALOG_TRIP',
    tripId: '12004',
    serviceType: 'trains',
    operator: 'Shatabdi Express',
    code: '12004',
    route: 'New Delhi (NDLS) → Lucknow (LKO)',
    origin: 'New Delhi (NDLS)',
    destination: 'Lucknow (LKO)',
    departTime: '06:10',
    arriveTime: '12:40',
    duration: '6h 30m',
    travelClass: 'AC Chair Car',
    basePrice: 1165,
    fareAmount: 1165,
    fareFormatted: '₹ 1,165',
    currency: 'INR',
    availableSeats: 58,
    refundable: true,
    imageUrl: 'https://images.unsplash.com/photo-1532105956626-9569c03602f6?auto=format&fit=crop&w=800&q=80',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'trip#trains#12952',
    entityType: 'CATALOG_TRIP',
    tripId: '12952',
    serviceType: 'trains',
    operator: 'Mumbai Rajdhani',
    code: '12952',
    route: 'New Delhi (NDLS) → Mumbai Central (MMCT)',
    origin: 'New Delhi (NDLS)',
    destination: 'Mumbai Central (MMCT)',
    departTime: '16:55',
    arriveTime: '08:35',
    duration: '15h 40m',
    travelClass: '3A AC 3 Tier',
    basePrice: 2850,
    fareAmount: 2850,
    fareFormatted: '₹ 2,850',
    currency: 'INR',
    availableSeats: 40,
    refundable: true,
    imageUrl: 'https://images.unsplash.com/photo-1532105956626-9569c03602f6?auto=format&fit=crop&w=800&q=80',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
  {
    id: 'trip#buses#BUS-782',
    entityType: 'CATALOG_TRIP',
    tripId: 'BUS-782',
    serviceType: 'buses',
    operator: 'Zingbus Premium Volvo',
    code: 'BUS-782',
    route: 'Delhi → Manali',
    origin: 'Delhi',
    destination: 'Manali',
    departTime: '20:30',
    arriveTime: '08:30',
    duration: '12h 00m',
    travelClass: 'AC Sleeper / Seater',
    basePrice: 1450,
    fareAmount: 1450,
    fareFormatted: '₹ 1,450',
    currency: 'INR',
    availableSeats: 22,
    refundable: true,
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    isCatalogDemo: true,
    inventoryDisclaimer: 'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed',
  },
];

/**
 * DynamoDB Repository Implementation targeting AgentTravelBookings and AgentTravelCases.
 */
export class DynamoDBRepository {
  constructor() {
    const rawClient = new DynamoDBClient({ region: REGION });
    this.docClient = DynamoDBDocumentClient.from(rawClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
    this.bookingsTable = BOOKINGS_TABLE;
    this.casesTable = CASES_TABLE;
    this.region = REGION;
  }

  // --- Bookings ---
  async saveBooking(booking) {
    if (!booking || !booking.id) throw new Error('Booking must have an id');
    const nowIso = new Date().toISOString();
    const item = {
      entityType: 'BOOKING',
      ...booking,
      updatedAt: nowIso,
      createdAt: booking.createdAt || nowIso,
    };
    await this.docClient.send(
      new PutCommand({
        TableName: this.bookingsTable,
        Item: item,
      })
    );
    return item;
  }

  async getBooking(bookingId) {
    if (!bookingId) return null;
    const clean = bookingId.toString().trim();

    // 1. Point lookup by primary key
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.bookingsTable,
        Key: { id: clean },
      })
    );
    if (res.Item && (res.Item.entityType === 'BOOKING' || !res.Item.entityType)) {
      if (
        !res.Item.entityType &&
        (clean.startsWith('order#') || clean.startsWith('webhook#') || clean.startsWith('dest#') || clean.startsWith('trip#'))
      ) {
        return null;
      }
      return res.Item;
    }

    // 2. Fallback lookup by code or PNR in bookings table
    let exclusiveStartKey = undefined;
    do {
      const scanParams = {
        TableName: this.bookingsTable,
        FilterExpression:
          '(#bCode = :clean OR #pnr = :clean OR bookingDetails.code = :clean) AND (entityType = :bType OR attribute_not_exists(entityType))',
        ExpressionAttributeNames: {
          '#bCode': 'code',
          '#pnr': 'pnr',
        },
        ExpressionAttributeValues: {
          ':clean': clean,
          ':bType': 'BOOKING',
        },
      };
      if (exclusiveStartKey) {
        scanParams.ExclusiveStartKey = exclusiveStartKey;
      }
      const scanRes = await this.docClient.send(new ScanCommand(scanParams));
      if (scanRes.Items && scanRes.Items.length > 0) {
        return scanRes.Items[0];
      }
      exclusiveStartKey = scanRes.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return null;
  }

  async listBookings() {
    let rawItems = [];
    let exclusiveStartKey = undefined;
    do {
      const scanParams = {
        TableName: this.bookingsTable,
        FilterExpression: 'entityType = :bType OR attribute_not_exists(entityType)',
        ExpressionAttributeValues: { ':bType': 'BOOKING' },
      };
      if (exclusiveStartKey) {
        scanParams.ExclusiveStartKey = exclusiveStartKey;
      }
      const res = await this.docClient.send(new ScanCommand(scanParams));
      if (res.Items && res.Items.length > 0) {
        rawItems.push(...res.Items);
      }
      exclusiveStartKey = res.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return rawItems.filter(
      (item) =>
        item.entityType === 'BOOKING' ||
        (!item.entityType &&
          !item.id.startsWith('order#') &&
          !item.id.startsWith('webhook#') &&
          !item.id.startsWith('dest#') &&
          !item.id.startsWith('trip#'))
    );
  }

  async updateBookingPayment(bookingId, paymentData = {}) {
    const cleanId = bookingId.toString().trim();
    const nowIso = new Date().toISOString();

    const updateKeys = Object.keys(paymentData);
    const expressionAttributeNames = { '#updatedAt': 'updatedAt' };
    const expressionAttributeValues = {
      ':now': nowIso,
      ':bType': 'BOOKING',
    };
    const setClauses = ['#updatedAt = :now', 'entityType = if_not_exists(entityType, :bType)'];

    for (let i = 0; i < updateKeys.length; i++) {
      const key = updateKeys[i];
      const attrName = `#k${i}`;
      const attrVal = `:v${i}`;
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrVal] = paymentData[key];
      setClauses.push(`${attrName} = ${attrVal}`);
    }

    const params = {
      TableName: this.bookingsTable,
      Key: { id: cleanId },
      UpdateExpression: `SET ${setClauses.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    // Atomic Condition: If paymentStatus is being set to anything OTHER than 'PAID',
    // prevent concurrent requests or stale retries from downgrading an existing 'PAID' booking.
    if (paymentData.paymentStatus && paymentData.paymentStatus !== 'PAID') {
      params.ConditionExpression = 'attribute_not_exists(paymentStatus) OR paymentStatus <> :paidStatus';
      expressionAttributeValues[':paidStatus'] = 'PAID';
    }

    try {
      const res = await this.docClient.send(new UpdateCommand(params));
      return res.Attributes;
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        console.warn(`[DB] Atomic condition blocked attempt to downgrade booking ${cleanId} from PAID to ${paymentData.paymentStatus}`);
        return await this.getBooking(cleanId);
      }
      throw err;
    }
  }

  // --- Orders Mapping ---
  /**
   * Atomically claims an order-creation attempt for a booking in DynamoDB with a unique fencing token.
   * Prevents concurrent race conditions from generating duplicate provider orders.
   */
  async claimBookingOrderCreation(bookingId, initialBookingData = {}, staleClaimTimeoutMs = 15000) {
    const cleanId = bookingId.toString().trim();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const staleThresholdIso = new Date(nowMs - staleClaimTimeoutMs).toISOString();
    const claimToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

    const newBookingItem = {
      id: cleanId,
      entityType: 'BOOKING',
      paymentStatus: 'PENDING',
      orderClaimStatus: 'IN_PROGRESS',
      orderClaimToken: claimToken,
      orderClaimedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...initialBookingData,
    };

    // 1. Attempt atomic Put if booking does NOT exist
    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.bookingsTable,
          Item: newBookingItem,
          ConditionExpression: 'attribute_not_exists(id)',
        })
      );
      return { claimed: true, claimToken, isNew: true, booking: newBookingItem };
    } catch (putErr) {
      if (putErr.name !== 'ConditionalCheckFailedException') {
        throw putErr;
      }
    }

    // 2. The booking already exists. Read current state.
    const existing = await this.getBooking(cleanId);
    if (!existing) {
      return { inProgress: true, error: 'Booking state conflict. Please retry.' };
    }

    // Check if already paid
    if (existing.paymentStatus === 'PAID') {
      return { alreadyPaid: true, booking: existing };
    }

    // Check if valid pending Razorpay order is already attached
    if (existing.razorpayOrderId && existing.paymentStatus === 'PENDING') {
      const existingOrder = await this.getOrder(existing.razorpayOrderId);
      return {
        reused: true,
        orderId: existing.razorpayOrderId,
        order: existingOrder,
        booking: existing,
      };
    }

    // Check if another request currently holds an active (non-stale) claim
    if (
      existing.orderClaimStatus === 'IN_PROGRESS' &&
      existing.orderClaimedAt &&
      existing.orderClaimedAt > staleThresholdIso
    ) {
      return {
        inProgress: true,
        error: 'An order creation is currently in progress for this booking. Please retry in a few seconds.',
        booking: existing,
      };
    }

    // 3. Atomically acquire/renew claim on existing pending booking with unique claimToken
    try {
      const updateParams = {
        TableName: this.bookingsTable,
        Key: { id: cleanId },
        UpdateExpression:
          'SET orderClaimStatus = :inProg, orderClaimToken = :token, orderClaimedAt = :now, updatedAt = :now',
        ConditionExpression:
          '(attribute_not_exists(paymentStatus) OR paymentStatus <> :paid) AND ' +
          '(attribute_not_exists(razorpayOrderId) OR razorpayOrderId = :null) AND ' +
          '(attribute_not_exists(orderClaimStatus) OR orderClaimStatus <> :inProg OR orderClaimedAt <= :staleThreshold)',
        ExpressionAttributeValues: {
          ':inProg': 'IN_PROGRESS',
          ':token': claimToken,
          ':now': nowIso,
          ':paid': 'PAID',
          ':null': null,
          ':staleThreshold': staleThresholdIso,
        },
        ReturnValues: 'ALL_NEW',
      };
      const res = await this.docClient.send(new UpdateCommand(updateParams));
      return { claimed: true, claimToken, isNew: false, booking: res.Attributes };
    } catch (updateErr) {
      if (updateErr.name === 'ConditionalCheckFailedException') {
        const fresh = await this.getBooking(cleanId);
        if (fresh && fresh.paymentStatus === 'PAID') {
          return { alreadyPaid: true, booking: fresh };
        }
        if (fresh && fresh.razorpayOrderId) {
          const freshOrder = await this.getOrder(fresh.razorpayOrderId);
          return {
            reused: true,
            orderId: fresh.razorpayOrderId,
            order: freshOrder,
            booking: fresh,
          };
        }
        return {
          inProgress: true,
          error: 'An order creation is currently in progress for this booking. Please retry.',
          booking: fresh,
        };
      }
      throw updateErr;
    }
  }

  async releaseBookingOrderClaim(bookingId, claimToken, failureReason = '') {
    if (!claimToken) {
      return { released: false, error: 'claimToken is required to release claim' };
    }
    const cleanId = bookingId.toString().trim();
    const nowIso = new Date().toISOString();
    try {
      const res = await this.docClient.send(
        new UpdateCommand({
          TableName: this.bookingsTable,
          Key: { id: cleanId },
          UpdateExpression:
            'SET orderClaimStatus = :failed, orderClaimError = :reason, updatedAt = :now',
          ConditionExpression:
            'attribute_exists(id) AND orderClaimToken = :token AND (attribute_not_exists(paymentStatus) OR paymentStatus <> :paid) AND (attribute_not_exists(razorpayOrderId) OR razorpayOrderId = :null)',
          ExpressionAttributeValues: {
            ':token': claimToken,
            ':failed': 'FAILED_RETRYABLE',
            ':reason': (failureReason || 'Order creation failed').slice(0, 500),
            ':now': nowIso,
            ':paid': 'PAID',
            ':null': null,
          },
          ReturnValues: 'ALL_NEW',
        })
      );
      return { released: true, booking: res.Attributes };
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        console.warn(`[DB] releaseBookingOrderClaim blocked for booking ${cleanId}: claimToken expired or mismatched.`);
        return { released: false, superseded: true };
      }
      throw err;
    }
  }

  async commitBookingOrder(bookingId, claimToken, orderId, orderData = null, bookingData = {}) {
    if (!claimToken) {
      throw new Error('claimToken is required to commit booking order');
    }
    const cleanBookingId = bookingId.toString().trim();
    const nowIso = new Date().toISOString();

    const updateKeys = Object.keys(bookingData);
    const expressionAttributeNames = {
      '#updatedAt': 'updatedAt',
      '#claimStatus': 'orderClaimStatus',
      '#claimToken': 'orderClaimToken',
    };
    const expressionAttributeValues = {
      ':now': nowIso,
      ':completed': 'COMPLETED',
      ':paid': 'PAID',
      ':claimToken': claimToken,
    };
    const setClauses = [
      '#updatedAt = :now',
      '#claimStatus = :completed',
    ];

    if (orderId) {
      expressionAttributeNames['#rzpOrderId'] = 'razorpayOrderId';
      expressionAttributeValues[':rzpOrderId'] = orderId;
      setClauses.push('#rzpOrderId = :rzpOrderId');
    }

    for (let i = 0; i < updateKeys.length; i++) {
      const key = updateKeys[i];
      if (key === 'id' || key === 'razorpayOrderId' || key === 'orderClaimStatus' || key === 'updatedAt' || key === 'orderClaimToken') continue;
      const attrName = `#k${i}`;
      const attrVal = `:v${i}`;
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrVal] = bookingData[key];
      setClauses.push(`${attrName} = ${attrVal}`);
    }

    // Fencing Condition: Must match the exact claim token that acquired the claim
    let conditionExpression =
      'attribute_exists(id) AND #claimToken = :claimToken AND (attribute_not_exists(paymentStatus) OR paymentStatus <> :paid)';
    if (orderId) {
      conditionExpression += ' AND (attribute_not_exists(razorpayOrderId) OR razorpayOrderId = :null OR razorpayOrderId = :rzpOrderId)';
      expressionAttributeValues[':null'] = null;
    }

    const bookingUpdateOperation = {
      Update: {
        TableName: this.bookingsTable,
        Key: { id: cleanBookingId },
        UpdateExpression: `SET ${setClauses.join(', ')}`,
        ConditionExpression: conditionExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      },
    };

    const transactItems = [bookingUpdateOperation];

    let orderItem = null;
    if (orderId && orderData) {
      orderItem = {
        id: `order#${orderId}`,
        entityType: 'ORDER',
        orderId,
        razorpayOrderId: orderId,
        bookingId: cleanBookingId,
        ...orderData,
        createdAt: nowIso,
      };

      transactItems.push({
        Put: {
          TableName: this.bookingsTable,
          Item: orderItem,
          ConditionExpression: 'attribute_not_exists(id)',
        },
      });
    }

    try {
      await this.docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
      const updatedBooking = await this.getBooking(cleanBookingId);
      return { success: true, booking: updatedBooking, order: orderItem };
    } catch (err) {
      if (err.name === 'TransactionCanceledException') {
        const reasons = err.CancellationReasons || [];
        console.warn(`[DB] TransactWrite canceled in commitBookingOrder for ${cleanBookingId}:`, JSON.stringify(reasons));

        const bookingFailed = reasons[0]?.Code === 'ConditionalCheckFailed';
        const orderFailed = reasons[1]?.Code === 'ConditionalCheckFailed';

        const currentBooking = await this.getBooking(cleanBookingId);
        const existingOrder = orderId ? await this.getOrder(orderId) : null;

        // If order already existed: verify if it matches this booking, amount, and currency
        if (orderFailed && existingOrder) {
          const isSameBooking = String(existingOrder.bookingId).trim() === cleanBookingId;
          const isSameAmount = Number(existingOrder.amount) === Number(orderData?.amount);
          const isSameCurrency = !orderData?.currency || existingOrder.currency === orderData?.currency;

          if (isSameBooking && isSameAmount && isSameCurrency) {
            // Safe idempotent match: if the booking also matches, return reused
            if (currentBooking && currentBooking.razorpayOrderId === orderId) {
              return {
                success: true,
                booking: currentBooking,
                order: existingOrder,
                reused: true,
              };
            }
          }

          // Order ID exists for a different booking or different amount/currency - fail safely!
          return {
            success: false,
            orderConflict: true,
            error: `Order '${orderId}' already exists with conflicting binding or amount.`,
            booking: currentBooking,
          };
        }

        // Booking condition failed: either claim was superseded (lost claim) or paymentStatus was PAID
        if (bookingFailed || !currentBooking || currentBooking.orderClaimToken !== claimToken) {
          return {
            success: false,
            lostClaim: true,
            booking: currentBooking,
            error: 'Claim token superseded or booking state changed concurrently.',
          };
        }

        return {
          success: false,
          error: 'Transaction canceled due to conflict.',
          booking: currentBooking,
        };
      }
      throw err;
    }
  }

  // --- Orders Mapping ---
  async saveOrder(orderId, orderData) {
    const item = {
      id: `order#${orderId}`,
      entityType: 'ORDER',
      orderId,
      razorpayOrderId: orderId,
      ...orderData,
      createdAt: new Date().toISOString(),
    };
    await this.docClient.send(
      new PutCommand({
        TableName: this.bookingsTable,
        Item: item,
      })
    );
    return item;
  }

  async getOrder(orderId) {
    if (!orderId) return null;
    const clean = orderId.toString().trim();

    // 1. Point lookup by prefixed key
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.bookingsTable,
        Key: { id: `order#${clean}` },
      })
    );
    if (res.Item) return res.Item;

    // 2. Query GSI razorpayOrderId-index
    const gsiRes = await this.docClient.send(
      new QueryCommand({
        TableName: this.bookingsTable,
        IndexName: 'razorpayOrderId-index',
        KeyConditionExpression: 'razorpayOrderId = :oid',
        ExpressionAttributeValues: { ':oid': clean },
        Limit: 2,
      })
    );
    const items = gsiRes.Items || [];
    const orderItem = items.find((it) => it.entityType === 'ORDER');
    if (orderItem) return orderItem;

    // Fallback: If booking item has the order details
    const bookingItem = items.find((it) => it.entityType === 'BOOKING' || !it.entityType);
    if (bookingItem) {
      return {
        orderId: clean,
        bookingId: bookingItem.id,
        amount: Math.round((bookingItem.amount || 0) * 100),
        currency: bookingItem.currency || 'INR',
        tripDetails: bookingItem.bookingDetails,
        travelerDetails: bookingItem.travelerDetails,
        status: bookingItem.paymentStatus === 'PAID' ? 'paid' : 'created',
      };
    }

    return null;
  }

  // --- Webhooks & Audit ---
  async isWebhookProcessed(eventId) {
    if (!eventId) return false;
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.bookingsTable,
        Key: { id: `webhook#${eventId}` },
      })
    );
    return Boolean(res.Item);
  }

  async recordWebhookEvent(eventId, eventName, payload) {
    const item = {
      id: `webhook#${eventId}`,
      entityType: 'WEBHOOK_EVENT',
      eventId,
      eventName,
      receivedAt: new Date().toISOString(),
      payloadSummary: {
        entity: payload?.entity,
        orderId: payload?.payload?.payment?.entity?.order_id || payload?.payload?.order?.entity?.id,
        paymentId: payload?.payload?.payment?.entity?.id,
        amount: payload?.payload?.payment?.entity?.amount,
      },
    };
    await this.docClient.send(
      new PutCommand({
        TableName: this.bookingsTable,
        Item: item,
      })
    );
    return item;
  }

  /**
   * Atomic webhook event processing with conditional booking status update.
   */
  async transactProcessWebhook({ eventId, eventName, payloadSummary, bookingId, paymentStatus, paymentId, orderId, failureReason }) {
    const nowIso = new Date().toISOString();
    const eventItem = {
      id: `webhook#${eventId}`,
      entityType: 'WEBHOOK_EVENT',
      eventId,
      eventName,
      receivedAt: nowIso,
      payloadSummary: payloadSummary || {},
    };

    // Scenario A: Valid event with an associated internal booking
    if (bookingId) {
      const isPaidEvent = paymentStatus === 'PAID';
      const transactItems = [
        {
          Put: {
            TableName: this.bookingsTable,
            Item: eventItem,
            ConditionExpression: 'attribute_not_exists(id)',
          },
        },
      ];

      if (isPaidEvent) {
        transactItems.push({
          Update: {
            TableName: this.bookingsTable,
            Key: { id: bookingId },
            UpdateExpression:
              'SET paymentStatus = :paid, razorpayPaymentId = :pid, razorpayOrderId = :oid, paymentVerifiedAt = :now, updatedAt = :now',
            ConditionExpression: 'attribute_exists(id)',
            ExpressionAttributeValues: {
              ':paid': 'PAID',
              ':pid': paymentId,
              ':oid': orderId,
              ':now': nowIso,
            },
          },
        });
      } else {
        // Payment failed: Never downgrade a PAID booking
        transactItems.push({
          Update: {
            TableName: this.bookingsTable,
            Key: { id: bookingId },
            UpdateExpression:
              'SET paymentStatus = :failed, failureReason = :reason, updatedAt = :now',
            ConditionExpression: 'attribute_exists(id) AND paymentStatus <> :paid',
            ExpressionAttributeValues: {
              ':failed': 'FAILED',
              ':reason': failureReason || 'Payment failed event from Razorpay',
              ':paid': 'PAID',
              ':now': nowIso,
            },
          },
        });
      }

      try {
        await this.docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
        return { success: true, processed: true, bookingId };
      } catch (err) {
        if (err.name === 'TransactionCanceledException') {
          const reasons = err.CancellationReasons || [];
          if (reasons[0]?.Code === 'ConditionalCheckFailed') {
            return { success: true, alreadyProcessed: true };
          }
          if (reasons[1]?.Code === 'ConditionalCheckFailed') {
            if (isPaidEvent) {
              const bookingErr = new Error(`Required booking update failed: booking ${bookingId} not found`);
              bookingErr.name = 'TransactionCanceledException';
              throw bookingErr;
            }

            // Stale payment.failed received for already PAID booking:
            // Preserve PAID status and durably record the webhook event to avoid endless retries.
            const existingBooking = await this.getBooking(bookingId);
            if (existingBooking && existingBooking.paymentStatus === 'PAID') {
              eventItem.statusNote = 'Ignored downgrade: booking already PAID';
              try {
                await this.docClient.send(
                  new PutCommand({
                    TableName: this.bookingsTable,
                    Item: eventItem,
                    ConditionExpression: 'attribute_not_exists(id)',
                  })
                );
              } catch (putErr) {
                if (putErr.name === 'ConditionalCheckFailedException') {
                  return { success: true, alreadyProcessed: true };
                }
                throw putErr;
              }
              console.warn(`[WEBHOOK] Preserved PAID status for booking ${bookingId}; durably recorded stale failed event ${eventId}`);
              return { success: true, processed: true, bookingConditionIgnored: true };
            }

            // Booking not found for failed event: durably record event as unmatched
            try {
              await this.docClient.send(
                new PutCommand({
                  TableName: this.bookingsTable,
                  Item: eventItem,
                  ConditionExpression: 'attribute_not_exists(id)',
                })
              );
            } catch (putErr) {
              if (putErr.name === 'ConditionalCheckFailedException') {
                return { success: true, alreadyProcessed: true };
              }
            }
            return { success: true, processed: true, bookingConditionIgnored: true };
          }
        }
        throw err;
      }
    } else {
      // Scenario B: Valid event without a matching booking. Safely record unattached event.
      eventItem.entityType = 'UNMATCHED_WEBHOOK_EVENT';
      try {
        await this.docClient.send(
          new PutCommand({
            TableName: this.bookingsTable,
            Item: eventItem,
            ConditionExpression: 'attribute_not_exists(id)',
          })
        );
        return { success: true, unmatchedRecorded: true };
      } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
          return { success: true, alreadyProcessed: true };
        }
        throw err;
      }
    }
  }

  // --- Refunds ---
  async saveRefund(refund) {
    if (!refund || !refund.id) throw new Error('Refund must have an id');
    const nowIso = new Date().toISOString();
    const item = {
      version: refund.version || 1,
      ...refund,
      updatedAt: nowIso,
      createdAt: refund.createdAt || nowIso,
    };
    await this.docClient.send(
      new PutCommand({
        TableName: this.casesTable,
        Item: item,
      })
    );
    return item;
  }

  async getRefund(refundId) {
    if (!refundId) return null;
    const clean = refundId.toString().replace(/^#/, '').trim();
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.casesTable,
        Key: { id: clean },
      })
    );
    return res.Item || null;
  }

  async getRefundByBookingId(bookingId) {
    if (!bookingId) return null;
    const clean = bookingId.toString().trim();
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.casesTable,
        IndexName: 'bookingId-index',
        KeyConditionExpression: 'bookingId = :bId',
        ExpressionAttributeValues: { ':bId': clean },
        Limit: 1,
      })
    );
    return (res.Items && res.Items[0]) || null;
  }

  /**
   * Atomic refund case creation linking to booking.
   * Requires booking to exist, be in PAID status, and have no existing refundCaseId.
   */
  async transactCreateRefund(refundRecord, bookingId) {
    const cleanBookingId = bookingId.trim();
    const nowIso = new Date().toISOString();
    const item = {
      version: 1,
      ...refundRecord,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const transactItems = [
      {
        Put: {
          TableName: this.casesTable,
          Item: item,
          ConditionExpression: 'attribute_not_exists(id)',
        },
      },
      {
        Update: {
          TableName: this.bookingsTable,
          Key: { id: cleanBookingId },
          UpdateExpression: 'SET refundCaseId = :cid, refundStatus = :rStatus, updatedAt = :now',
          ConditionExpression:
            'attribute_exists(id) AND paymentStatus = :paid AND attribute_not_exists(refundCaseId)',
          ExpressionAttributeValues: {
            ':cid': item.id,
            ':rStatus': 'Under Investigation',
            ':paid': 'PAID',
            ':now': nowIso,
          },
        },
      },
    ];

    try {
      await this.docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
      return { success: true, refund: item };
    } catch (err) {
      if (err.name === 'TransactionCanceledException') {
        const reasons = err.CancellationReasons || [];
        if (reasons[0]?.Code === 'ConditionalCheckFailed') {
          return { success: false, duplicateCase: true, error: `Refund case '${item.id}' already exists` };
        }
        if (reasons[1]?.Code === 'ConditionalCheckFailed') {
          const booking = await this.getBooking(cleanBookingId);
          if (!booking) {
            return { success: false, notFound: true, error: `Booking '${cleanBookingId}' not found` };
          }
          if (booking.paymentStatus !== 'PAID') {
            return {
              success: false,
              notEligible: true,
              error: `Booking must be in PAID status to request a refund. Current status: ${booking.paymentStatus}`,
            };
          }
          if (booking.refundCaseId) {
            const existing = (await this.getRefund(booking.refundCaseId)) || (await this.getRefundByBookingId(cleanBookingId));
            return { success: false, conflict: true, existingRefund: existing };
          }
        }
      }
      throw err;
    }
  }

  /**
   * Atomic reviewer decision update with optimistic locking on case version.
   * Enforces immutability on all finalized refund statuses (Approved, Disbursed, Rejected).
   */
  async transactReviewerDecision({ refundId, bookingId, updateData, expectedVersion }) {
    const cleanId = refundId.trim();
    const nowIso = new Date().toISOString();
    const transactItems = [
      {
        Update: {
          TableName: this.casesTable,
          Key: { id: cleanId },
          UpdateExpression:
            'SET decisionStatus = :newDecisionStatus, #s = :newStatus, finalDecision = :summary, reviewerComment = :comment, assignedAuditor = :auditor, approvedAmount = :amt, auditLog = :auditLog, history = :history, decisionRecordedAt = :now, version = version + :one, updatedAt = :now',
          ConditionExpression:
            'attribute_exists(id) AND decisionStatus <> :approved AND decisionStatus <> :disbursed AND decisionStatus <> :rejected AND version = :expVer',
          ExpressionAttributeNames: {
            '#s': 'status',
          },
          ExpressionAttributeValues: {
            ':newDecisionStatus': updateData.decisionStatus,
            ':newStatus': updateData.status,
            ':summary': updateData.finalDecision,
            ':comment': updateData.reviewerComment,
            ':auditor': updateData.assignedAuditor,
            ':amt': updateData.approvedAmount,
            ':auditLog': updateData.auditLog,
            ':history': updateData.history,
            ':now': nowIso,
            ':one': 1,
            ':approved': 'Approved',
            ':disbursed': 'Disbursed',
            ':rejected': 'Rejected',
            ':expVer': expectedVersion,
          },
        },
      },
    ];

    if (bookingId && updateData.bookingRefundStatus) {
      transactItems.push({
        Update: {
          TableName: this.bookingsTable,
          Key: { id: bookingId },
          UpdateExpression: 'SET refundStatus = :bStatus, updatedAt = :now',
          ConditionExpression: 'attribute_exists(id)',
          ExpressionAttributeValues: {
            ':bStatus': updateData.bookingRefundStatus,
            ':now': nowIso,
          },
        },
      });
    }

    try {
      await this.docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
      const updated = await this.getRefund(cleanId);
      return { success: true, refund: updated };
    } catch (err) {
      if (err.name === 'TransactionCanceledException') {
        const reasons = err.CancellationReasons || [];
        if (reasons[0]?.Code === 'ConditionalCheckFailed') {
          const existing = await this.getRefund(cleanId);
          if (!existing) return { success: false, notFound: true };
          if (isFinalizedRefundStatus(existing.decisionStatus) || isFinalizedRefundStatus(existing.status)) {
            return { success: false, finalized: true, currentStatus: existing.decisionStatus || existing.status };
          }
          return { success: false, concurrencyConflict: true, currentVersion: existing.version };
        }
      }
      throw err;
    }
  }

  async saveDraftNote(refundId, draftData = {}) {
    const cleanId = refundId.trim();
    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const refund = await this.getRefund(cleanId);
    if (!refund) return null;

    const currentStatus = refund.decisionStatus || refund.status;
    if (isFinalizedRefundStatus(currentStatus)) {
      throw new Error(`Cannot save draft: Case is already in finalized status '${currentStatus}'`);
    }

    if (draftData.expectedVersion !== undefined && refund.version !== draftData.expectedVersion) {
      const err = new Error('Case was modified by another reviewer. Please refresh before saving draft.');
      err.concurrencyConflict = true;
      throw err;
    }

    const decisionPart = draftData.draftDecision ? ` (Pending Decision: ${draftData.draftDecision})` : '';
    const auditLogItem = {
      id: `log-${Date.now()}`,
      time: nowTime,
      title: 'Reviewer Draft Note Saved',
      description: `Draft saved by ${draftData.reviewerId || 'Auditor'}${decisionPart}. Note: ${draftData.reviewerNote}`,
      dotColor: 'bg-secondary',
    };

    const updatedAuditLog = [auditLogItem, ...(refund.auditLog || [])];

    let conditionExpression =
      'attribute_exists(id) AND decisionStatus <> :approved AND decisionStatus <> :disbursed AND decisionStatus <> :rejected';
    const expressionValues = {
      ':note': draftData.reviewerNote,
      ':decision': draftData.draftDecision || null,
      ':now': nowIso,
      ':auditor': draftData.reviewerId || 'Julian Hayes (Lead Auditor)',
      ':log': updatedAuditLog,
      ':approved': 'Approved',
      ':disbursed': 'Disbursed',
      ':rejected': 'Rejected',
    };

    if (draftData.expectedVersion !== undefined) {
      conditionExpression += ' AND version = :expVer';
      expressionValues[':expVer'] = draftData.expectedVersion;
    }

    try {
      await this.docClient.send(
        new UpdateCommand({
          TableName: this.casesTable,
          Key: { id: cleanId },
          UpdateExpression:
            'SET reviewerDraftNote = :note, reviewerDraftDecision = :decision, reviewerDraftSavedAt = :now, reviewerDraftSavedBy = :auditor, auditLog = :log, updatedAt = :now',
          ConditionExpression: conditionExpression,
          ExpressionAttributeValues: expressionValues,
        })
      );
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        const existing = await this.getRefund(cleanId);
        if (existing && isFinalizedRefundStatus(existing.decisionStatus)) {
          throw new Error(`Cannot save draft: Case is already in finalized status '${existing.decisionStatus}'`);
        }
        const conflictErr = new Error('Case was modified by another reviewer. Please refresh before saving draft.');
        conflictErr.concurrencyConflict = true;
        throw conflictErr;
      }
      throw err;
    }

    return await this.getRefund(cleanId);
  }

  async listRefunds(filter = {}, pagination = {}) {
    if (filter.bookingId) {
      const res = await this.docClient.send(
        new QueryCommand({
          TableName: this.casesTable,
          IndexName: 'bookingId-index',
          KeyConditionExpression: 'bookingId = :bId',
          ExpressionAttributeValues: { ':bId': filter.bookingId },
        })
      );
      return { items: res.Items || [], lastEvaluatedKey: null };
    }

    const scanParams = {
      TableName: this.casesTable,
      Limit: pagination.limit ? Number(pagination.limit) : 50,
    };

    if (pagination.exclusiveStartKey) {
      scanParams.ExclusiveStartKey = pagination.exclusiveStartKey;
    }

    if (filter.status) {
      scanParams.FilterExpression = '#s = :status OR decisionStatus = :status';
      scanParams.ExpressionAttributeNames = { '#s': 'status' };
      scanParams.ExpressionAttributeValues = { ':status': filter.status };
    }

    const res = await this.docClient.send(new ScanCommand(scanParams));
    return {
      items: res.Items || [],
      lastEvaluatedKey: res.LastEvaluatedKey || null,
    };
  }

  async updateRefund(refundId, updateData) {
    const refund = await this.getRefund(refundId);
    if (!refund) return null;
    const nowIso = new Date().toISOString();
    const updated = {
      ...refund,
      ...updateData,
      updatedAt: nowIso,
    };
    await this.docClient.send(
      new PutCommand({
        TableName: this.casesTable,
        Item: updated,
      })
    );
    return updated;
  }

  // --- Travel Catalog (Demo Showcase Inventory) ---

  async seedCatalogIfEmpty(options = {}) {
    const { onProgress } = options;
    let seededCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < DEMO_CATALOG_DESTINATIONS.length; i++) {
      const dest = DEMO_CATALOG_DESTINATIONS[i];
      try {
        await this.docClient.send(
          new PutCommand({
            TableName: this.bookingsTable,
            Item: { ...dest },
            ConditionExpression: 'attribute_not_exists(id)',
          })
        );
        seededCount++;
        if (onProgress) onProgress({ type: 'destination', index: i + 1, total: DEMO_CATALOG_DESTINATIONS.length, id: dest.id, status: 'INSERTED' });
      } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
          skippedCount++;
          if (onProgress) onProgress({ type: 'destination', index: i + 1, total: DEMO_CATALOG_DESTINATIONS.length, id: dest.id, status: 'ALREADY_EXISTS' });
        } else {
          errors.push({ id: dest.id, error: err.message });
          if (onProgress) onProgress({ type: 'destination', index: i + 1, total: DEMO_CATALOG_DESTINATIONS.length, id: dest.id, status: 'ERROR', error: err.message });
          console.warn(`[CATALOG SEED] Notice for destination ${dest.id}:`, err.message);
        }
      }
    }

    for (let i = 0; i < DEMO_CATALOG_TRIPS.length; i++) {
      const trip = DEMO_CATALOG_TRIPS[i];
      try {
        await this.docClient.send(
          new PutCommand({
            TableName: this.bookingsTable,
            Item: { ...trip },
            ConditionExpression: 'attribute_not_exists(id)',
          })
        );
        seededCount++;
        if (onProgress) onProgress({ type: 'trip', index: i + 1, total: DEMO_CATALOG_TRIPS.length, id: trip.id, status: 'INSERTED' });
      } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
          skippedCount++;
          if (onProgress) onProgress({ type: 'trip', index: i + 1, total: DEMO_CATALOG_TRIPS.length, id: trip.id, status: 'ALREADY_EXISTS' });
        } else {
          errors.push({ id: trip.id, error: err.message });
          if (onProgress) onProgress({ type: 'trip', index: i + 1, total: DEMO_CATALOG_TRIPS.length, id: trip.id, status: 'ERROR', error: err.message });
          console.warn(`[CATALOG SEED] Notice for trip ${trip.id}:`, err.message);
        }
      }
    }

    return {
      success: errors.length === 0,
      seededCount,
      skippedCount,
      errors,
      totalDestinations: DEMO_CATALOG_DESTINATIONS.length,
      totalTrips: DEMO_CATALOG_TRIPS.length,
    };
  }

  async getCatalogDestinations(category) {
    try {
      let items = [];
      let exclusiveStartKey = undefined;
      do {
        const scanParams = {
          TableName: this.bookingsTable,
          FilterExpression: 'entityType = :dType',
          ExpressionAttributeValues: { ':dType': 'CATALOG_DESTINATION' },
        };
        if (exclusiveStartKey) {
          scanParams.ExclusiveStartKey = exclusiveStartKey;
        }
        const res = await this.docClient.send(new ScanCommand(scanParams));
        if (res.Items && res.Items.length > 0) {
          items.push(...res.Items);
        }
        exclusiveStartKey = res.LastEvaluatedKey;
      } while (exclusiveStartKey);

      if (items.length === 0) {
        items = DEMO_CATALOG_DESTINATIONS;
      }
      if (!category || category.toLowerCase() === 'all') {
        return items;
      }
      return items.filter(
        (d) => d.category && d.category.toLowerCase() === category.toLowerCase()
      );
    } catch (err) {
      console.warn('[DB] getCatalogDestinations error, using demo catalog fallback:', err.message);
      if (!category || category.toLowerCase() === 'all') {
        return DEMO_CATALOG_DESTINATIONS;
      }
      return DEMO_CATALOG_DESTINATIONS.filter(
        (d) => d.category && d.category.toLowerCase() === category.toLowerCase()
      );
    }
  }

  async getCatalogTrips(filters = {}) {
    const { serviceType, origin, destination } = filters;
    try {
      let items = [];
      let exclusiveStartKey = undefined;
      do {
        const scanParams = {
          TableName: this.bookingsTable,
          FilterExpression: 'entityType = :tType',
          ExpressionAttributeValues: { ':tType': 'CATALOG_TRIP' },
        };
        if (exclusiveStartKey) {
          scanParams.ExclusiveStartKey = exclusiveStartKey;
        }
        const res = await this.docClient.send(new ScanCommand(scanParams));
        if (res.Items && res.Items.length > 0) {
          items.push(...res.Items);
        }
        exclusiveStartKey = res.LastEvaluatedKey;
      } while (exclusiveStartKey);

      if (items.length === 0) {
        items = DEMO_CATALOG_TRIPS;
      }
      return items.filter((t) => {
        if (serviceType && serviceType.toLowerCase() !== 'all' && t.serviceType?.toLowerCase() !== serviceType.toLowerCase()) {
          return false;
        }
        if (origin && !t.origin?.toLowerCase().includes(origin.toLowerCase()) && !origin.toLowerCase().includes(t.origin?.toLowerCase())) {
          return false;
        }
        if (destination && !t.destination?.toLowerCase().includes(destination.toLowerCase()) && !destination.toLowerCase().includes(t.destination?.toLowerCase())) {
          return false;
        }
        return true;
      });
    } catch (err) {
      console.warn('[DB] getCatalogTrips error, using demo catalog fallback:', err.message);
      return DEMO_CATALOG_TRIPS.filter((t) => {
        if (serviceType && serviceType.toLowerCase() !== 'all' && t.serviceType?.toLowerCase() !== serviceType.toLowerCase()) {
          return false;
        }
        if (origin && !t.origin?.toLowerCase().includes(origin.toLowerCase()) && !origin.toLowerCase().includes(t.origin?.toLowerCase())) {
          return false;
        }
        if (destination && !t.destination?.toLowerCase().includes(destination.toLowerCase()) && !destination.toLowerCase().includes(t.destination?.toLowerCase())) {
          return false;
        }
        return true;
      });
    }
  }

  async getCatalogTripById(tripId) {
    if (!tripId) return null;
    const clean = tripId.toString().trim();

    try {
      // 1. Direct point lookup if full PK provided (e.g. trip#flights#6E-204)
      if (clean.startsWith('trip#')) {
        const res = await this.docClient.send(
          new GetCommand({
            TableName: this.bookingsTable,
            Key: { id: clean },
          })
        );
        if (res.Item && res.Item.entityType === 'CATALOG_TRIP') return res.Item;
      }

      // 2. Point lookups using known service prefixes
      for (const svc of ['flights', 'trains', 'buses']) {
        const res = await this.docClient.send(
          new GetCommand({
            TableName: this.bookingsTable,
            Key: { id: `trip#${svc}#${clean}` },
          })
        );
        if (res.Item && res.Item.entityType === 'CATALOG_TRIP') return res.Item;
      }

      // 3. Scan lookup by tripId / code / flightNo with pagination
      let exclusiveStartKey = undefined;
      do {
        const scanParams = {
          TableName: this.bookingsTable,
          FilterExpression: 'entityType = :tType AND (tripId = :clean OR code = :clean OR flightNo = :clean)',
          ExpressionAttributeValues: {
            ':tType': 'CATALOG_TRIP',
            ':clean': clean,
          },
        };
        if (exclusiveStartKey) {
          scanParams.ExclusiveStartKey = exclusiveStartKey;
        }
        const scanRes = await this.docClient.send(new ScanCommand(scanParams));
        if (scanRes.Items && scanRes.Items.length > 0) return scanRes.Items[0];
        exclusiveStartKey = scanRes.LastEvaluatedKey;
      } while (exclusiveStartKey);
    } catch (err) {
      console.warn(`[DB] getCatalogTripById error for ${clean}:`, err.message);
    }

    // 4. Fallback to in-memory demo trips
    const cleanLower = clean.toLowerCase();
    return (
      DEMO_CATALOG_TRIPS.find(
        (t) =>
          t.tripId?.toLowerCase() === cleanLower ||
          t.code?.toLowerCase() === cleanLower ||
          t.flightNo?.toLowerCase() === cleanLower ||
          t.id?.toLowerCase() === cleanLower
      ) || null
    );
  }
}

/**
 * In-Memory Test Repository Implementation for Unit & Integration Tests.
 * Guarantees zero AWS calls, zero disk writes, and zero cross-suite interference.
 */
class InMemoryTestRepository {
  constructor() {
    this.store = {
      bookings: {},
      orders: {},
      payments: {},
      processedWebhooks: {},
      refunds: {},
      catalogDestinations: {},
      catalogTrips: {},
    };
    for (const d of DEMO_CATALOG_DESTINATIONS) {
      this.store.catalogDestinations[d.destinationId] = { ...d };
    }
    for (const t of DEMO_CATALOG_TRIPS) {
      this.store.catalogTrips[t.tripId] = { ...t };
    }
  }

  async saveBooking(booking) {
    if (!booking || !booking.id) throw new Error('Booking must have an id');
    const existing = this.store.bookings[booking.id] || {};
    this.store.bookings[booking.id] = {
      ...existing,
      ...booking,
      updatedAt: new Date().toISOString(),
    };
    return this.store.bookings[booking.id];
  }

  async getBooking(bookingId) {
    if (!bookingId) return null;
    if (this.store.bookings[bookingId]) {
      const b = this.store.bookings[bookingId];
      if (!b.entityType && (b.id?.startsWith('order#') || b.id?.startsWith('webhook#') || b.id?.startsWith('dest#') || b.id?.startsWith('trip#'))) {
        return null;
      }
      return b;
    }
    const clean = bookingId.toString().trim().toLowerCase();
    for (const b of Object.values(this.store.bookings)) {
      if (
        b.id.toLowerCase() === clean ||
        (b.bookingDetails?.code && b.bookingDetails.code.toLowerCase() === clean) ||
        (b.bookingDetails?.id && b.bookingDetails.id.toLowerCase() === clean)
      ) {
        if (!b.entityType && (b.id?.startsWith('order#') || b.id?.startsWith('webhook#') || b.id?.startsWith('dest#') || b.id?.startsWith('trip#'))) {
          continue;
        }
        return b;
      }
    }
    return null;
  }

  async listBookings() {
    return Object.values(this.store.bookings).filter(
      (b) =>
        b.entityType === 'BOOKING' ||
        (!b.entityType &&
          !b.id?.startsWith('order#') &&
          !b.id?.startsWith('webhook#') &&
          !b.id?.startsWith('dest#') &&
          !b.id?.startsWith('trip#'))
    );
  }

  async updateBookingPayment(bookingId, paymentData = {}) {
    const cleanId = bookingId.toString().trim();
    const booking = this.store.bookings[cleanId];
    if (!booking) {
      this.store.bookings[cleanId] = {
        id: cleanId,
        entityType: 'BOOKING',
        createdAt: new Date().toISOString(),
      };
    }

    const currentStatus = this.store.bookings[cleanId].paymentStatus;
    // Atomic Condition check: Never downgrade an existing 'PAID' booking
    if (currentStatus === 'PAID' && paymentData.paymentStatus && paymentData.paymentStatus !== 'PAID') {
      console.warn(`[TEST DB] Atomic condition blocked attempt to downgrade booking ${cleanId} from PAID to ${paymentData.paymentStatus}`);
      return this.store.bookings[cleanId];
    }

    this.store.bookings[cleanId] = {
      ...this.store.bookings[cleanId],
      ...paymentData,
      updatedAt: new Date().toISOString(),
    };
    return this.store.bookings[cleanId];
  }

  async claimBookingOrderCreation(bookingId, initialBookingData = {}, staleClaimTimeoutMs = 15000) {
    const cleanId = bookingId.toString().trim();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const staleThresholdIso = new Date(nowMs - staleClaimTimeoutMs).toISOString();
    const claimToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

    const existing = this.store.bookings[cleanId];
    if (!existing) {
      const newBooking = {
        id: cleanId,
        entityType: 'BOOKING',
        paymentStatus: 'PENDING',
        orderClaimStatus: 'IN_PROGRESS',
        orderClaimToken: claimToken,
        orderClaimedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        ...initialBookingData,
      };
      this.store.bookings[cleanId] = newBooking;
      return { claimed: true, claimToken, isNew: true, booking: newBooking };
    }

    if (existing.paymentStatus === 'PAID') {
      return { alreadyPaid: true, booking: existing };
    }

    if (existing.razorpayOrderId && existing.paymentStatus === 'PENDING') {
      const existingOrder = this.store.orders[existing.razorpayOrderId] || null;
      return {
        reused: true,
        orderId: existing.razorpayOrderId,
        order: existingOrder,
        booking: existing,
      };
    }

    if (
      existing.orderClaimStatus === 'IN_PROGRESS' &&
      existing.orderClaimedAt &&
      existing.orderClaimedAt > staleThresholdIso
    ) {
      return {
        inProgress: true,
        error: 'An order creation is currently in progress for this booking. Please retry in a few seconds.',
        booking: existing,
      };
    }

    existing.orderClaimStatus = 'IN_PROGRESS';
    existing.orderClaimToken = claimToken;
    existing.orderClaimedAt = nowIso;
    existing.updatedAt = nowIso;
    return { claimed: true, claimToken, isNew: false, booking: existing };
  }

  async releaseBookingOrderClaim(bookingId, claimToken, failureReason = '') {
    if (!claimToken) return { released: false, error: 'claimToken is required' };
    const cleanId = bookingId.toString().trim();
    const existing = this.store.bookings[cleanId];
    if (
      existing &&
      existing.orderClaimToken === claimToken &&
      existing.paymentStatus !== 'PAID' &&
      !existing.razorpayOrderId
    ) {
      existing.orderClaimStatus = 'FAILED_RETRYABLE';
      existing.orderClaimError = failureReason || 'Order creation failed';
      existing.updatedAt = new Date().toISOString();
      return { released: true, booking: existing };
    }
    return { released: false, superseded: true };
  }

  async commitBookingOrder(bookingId, claimToken, orderId, orderData = null, bookingData = {}) {
    if (!claimToken) {
      throw new Error('claimToken is required to commit booking order');
    }
    const cleanBookingId = bookingId.toString().trim();
    const nowIso = new Date().toISOString();

    const existing = this.store.bookings[cleanBookingId];
    if (!existing) {
      return { success: false, lostClaim: true, error: 'Booking not found' };
    }

    if (existing.orderClaimToken !== claimToken) {
      console.warn(`[TEST DB] Commit blocked for booking ${cleanBookingId}: claim token superseded.`);
      return {
        success: false,
        lostClaim: true,
        booking: existing,
        error: 'Claim token superseded by newer request.',
      };
    }

    if (existing.paymentStatus === 'PAID') {
      return { success: false, lostClaim: true, booking: existing, error: 'Booking already paid' };
    }

    if (existing.razorpayOrderId && orderId && existing.razorpayOrderId !== orderId) {
      return { success: false, lostClaim: true, booking: existing, error: 'Order conflict' };
    }

    // Atomic conflict verification for order existence
    if (orderId && this.store.orders[orderId]) {
      const existingOrder = this.store.orders[orderId];
      const isSameBooking = String(existingOrder.bookingId).trim() === cleanBookingId;
      const isSameAmount = Number(existingOrder.amount) === Number(orderData?.amount);
      const isSameCurrency = !orderData?.currency || existingOrder.currency === orderData?.currency;

      if (!isSameBooking || !isSameAmount || !isSameCurrency) {
        return {
          success: false,
          orderConflict: true,
          error: `Order '${orderId}' already exists with conflicting binding or amount.`,
          booking: existing,
        };
      }
      if (existing.razorpayOrderId === orderId) {
        return {
          success: true,
          booking: existing,
          order: existingOrder,
          reused: true,
        };
      }
    }

    // All-or-nothing transactional store write
    let orderItem = null;
    if (orderId && orderData) {
      orderItem = {
        id: `order#${orderId}`,
        entityType: 'ORDER',
        orderId,
        razorpayOrderId: orderId,
        bookingId: cleanBookingId,
        ...orderData,
        createdAt: nowIso,
      };
      this.store.orders[orderId] = orderItem;
    }

    this.store.bookings[cleanBookingId] = {
      ...existing,
      ...bookingData,
      id: cleanBookingId,
      ...(orderId ? { razorpayOrderId: orderId } : {}),
      orderClaimStatus: 'COMPLETED',
      updatedAt: nowIso,
    };
    return { success: true, booking: this.store.bookings[cleanBookingId], order: orderItem };
  }

  async saveOrder(orderId, orderData) {
    this.store.orders[orderId] = {
      ...orderData,
      orderId,
      createdAt: new Date().toISOString(),
    };
    return this.store.orders[orderId];
  }

  async getOrder(orderId) {
    return this.store.orders[orderId] || null;
  }

  async isWebhookProcessed(eventId) {
    return Boolean(this.store.processedWebhooks[eventId]);
  }

  async recordWebhookEvent(eventId, eventName, payload) {
    this.store.processedWebhooks[eventId] = {
      eventId,
      eventName,
      receivedAt: new Date().toISOString(),
      payloadSummary: payload || {},
    };
    return this.store.processedWebhooks[eventId];
  }

  async transactProcessWebhook({ eventId, eventName, payloadSummary, bookingId, paymentStatus, paymentId, orderId, failureReason }) {
    if (this.store.processedWebhooks[eventId]) {
      return { success: true, alreadyProcessed: true };
    }

    const nowIso = new Date().toISOString();
    const eventItem = {
      id: `webhook#${eventId}`,
      entityType: 'WEBHOOK_EVENT',
      eventId,
      eventName,
      receivedAt: nowIso,
      payloadSummary: payloadSummary || {},
    };

    if (bookingId) {
      const booking = this.store.bookings[bookingId];
      if (!booking) {
        // Required booking does not exist: required booking update failed!
        // Do NOT mark event processed
        const err = new Error(`Required booking update failed: booking ${bookingId} not found`);
        err.name = 'TransactionCanceledException';
        err.CancellationReasons = [{ Code: 'None' }, { Code: 'ConditionalCheckFailed' }];
        throw err;
      }

      if (paymentStatus === 'PAID') {
        booking.paymentStatus = 'PAID';
        booking.razorpayPaymentId = paymentId;
        booking.razorpayOrderId = orderId;
        booking.paymentVerifiedAt = nowIso;
        booking.updatedAt = nowIso;
      } else if (paymentStatus === 'FAILED') {
        if (booking.paymentStatus === 'PAID') {
          // Stale failure received after booking is already PAID:
          // Preserve PAID status and DURABLY RECORD the event to avoid endless retries.
          this.store.processedWebhooks[eventId] = {
            ...eventItem,
            statusNote: 'Ignored downgrade: booking already PAID',
          };
          console.warn(`[TEST DB] Preserved PAID status for booking ${bookingId}; durably recorded stale failed event ${eventId}`);
          return { success: true, processed: true, bookingConditionIgnored: true };
        }
        booking.paymentStatus = 'FAILED';
        booking.failureReason = failureReason;
        booking.updatedAt = nowIso;
      }
    }

    // Only mark processed after required booking update succeeded
    this.store.processedWebhooks[eventId] = eventItem;
    return { success: true, processed: true };
  }

  async saveRefund(refund) {
    if (!refund || !refund.id) throw new Error('Refund must have an id');
    const existing = this.store.refunds[refund.id] || {};
    this.store.refunds[refund.id] = {
      version: 1,
      ...existing,
      ...refund,
      updatedAt: new Date().toISOString(),
    };
    return this.store.refunds[refund.id];
  }

  async getRefund(refundId) {
    if (!refundId) return null;
    if (this.store.refunds[refundId]) return this.store.refunds[refundId];
    const clean = refundId.toString().replace(/^#/, '').trim().toLowerCase();
    for (const r of Object.values(this.store.refunds)) {
      if (
        r.id.toLowerCase() === clean ||
        (r.caseRef && r.caseRef.replace(/^#/, '').toLowerCase() === clean) ||
        (r.bookingId && r.bookingId.toLowerCase() === clean) ||
        (r.pnr && r.pnr.toLowerCase() === clean)
      ) {
        return r;
      }
    }
    return null;
  }

  async getRefundByBookingId(bookingId) {
    if (!bookingId) return null;
    const clean = bookingId.toString().trim().toLowerCase();
    for (const r of Object.values(this.store.refunds)) {
      if (
        (r.bookingId && r.bookingId.toLowerCase() === clean) ||
        (r.pnr && r.pnr.toLowerCase() === clean) ||
        (r.id && r.id.toLowerCase() === clean)
      ) {
        return r;
      }
    }
    const booking = await this.getBooking(bookingId);
    if (booking && booking.refundCaseId) {
      return await this.getRefund(booking.refundCaseId);
    }
    return null;
  }

  async transactCreateRefund(refundRecord, bookingId) {
    const cleanBookingId = bookingId.trim();

    // 1. In atomic transaction: verify booking exists, is PAID, and has no refundCaseId
    const booking = this.store.bookings[cleanBookingId];
    if (!booking) {
      return { success: false, notFound: true, error: `Booking '${cleanBookingId}' not found` };
    }
    if (booking.paymentStatus !== 'PAID') {
      return {
        success: false,
        notEligible: true,
        error: `Booking must be in PAID status to request a refund. Current status: ${booking.paymentStatus}`,
      };
    }
    if (booking.refundCaseId) {
      const existing = (await this.getRefund(booking.refundCaseId)) || (await this.getRefundByBookingId(cleanBookingId));
      return { success: false, conflict: true, existingRefund: existing };
    }

    if (this.store.refunds[refundRecord.id]) {
      return { success: false, duplicateCase: true, error: `Refund case '${refundRecord.id}' already exists` };
    }

    const nowIso = new Date().toISOString();
    const item = {
      version: 1,
      ...refundRecord,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.store.refunds[item.id] = item;

    booking.refundCaseId = item.id;
    booking.refundStatus = 'Under Investigation';
    booking.updatedAt = nowIso;

    return { success: true, refund: item };
  }

  async transactReviewerDecision({ refundId, bookingId, updateData, expectedVersion }) {
    const refund = await this.getRefund(refundId);
    if (!refund) return { success: false, notFound: true };

    const currentStatus = refund.decisionStatus || refund.status;
    if (isFinalizedRefundStatus(currentStatus)) {
      return { success: false, finalized: true, currentStatus };
    }

    if (expectedVersion !== undefined && refund.version !== expectedVersion) {
      return { success: false, concurrencyConflict: true, currentVersion: refund.version };
    }

    const nowIso = new Date().toISOString();
    const updated = {
      ...refund,
      decisionStatus: updateData.decisionStatus,
      status: updateData.status,
      finalDecision: updateData.finalDecision,
      reviewerComment: updateData.reviewerComment,
      assignedAuditor: updateData.assignedAuditor,
      approvedAmount: updateData.approvedAmount,
      auditLog: updateData.auditLog,
      history: updateData.history,
      decisionRecordedAt: nowIso,
      version: (refund.version || 1) + 1,
      updatedAt: nowIso,
    };
    this.store.refunds[refund.id] = updated;

    if (bookingId && this.store.bookings[bookingId] && updateData.bookingRefundStatus) {
      this.store.bookings[bookingId].refundStatus = updateData.bookingRefundStatus;
      this.store.bookings[bookingId].updatedAt = nowIso;
    }

    return { success: true, refund: updated };
  }

  async saveDraftNote(refundId, draftData = {}) {
    const refund = await this.getRefund(refundId);
    if (!refund) return null;

    const currentStatus = refund.decisionStatus || refund.status;
    if (isFinalizedRefundStatus(currentStatus)) {
      throw new Error(`Cannot save draft: Case is already in finalized status '${currentStatus}'`);
    }

    if (draftData.expectedVersion !== undefined && refund.version !== draftData.expectedVersion) {
      const err = new Error('Case was modified by another reviewer. Please refresh before saving draft.');
      err.concurrencyConflict = true;
      throw err;
    }

    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const decisionPart = draftData.draftDecision ? ` (Pending Decision: ${draftData.draftDecision})` : '';
    const auditLogItem = {
      id: `log-${Date.now()}`,
      time: nowTime,
      title: 'Reviewer Draft Note Saved',
      description: `Draft saved by ${draftData.reviewerId || 'Auditor'}${decisionPart}. Note: ${draftData.reviewerNote}`,
      dotColor: 'bg-secondary',
    };

    const updated = {
      ...refund,
      reviewerDraftNote: draftData.reviewerNote,
      reviewerDraftDecision: draftData.draftDecision || null,
      reviewerDraftSavedAt: nowIso,
      reviewerDraftSavedBy: draftData.reviewerId || 'Julian Hayes (Lead Auditor)',
      auditLog: [auditLogItem, ...(refund.auditLog || [])],
      updatedAt: nowIso,
    };
    this.store.refunds[refund.id] = updated;
    return updated;
  }

  async listRefunds(filter = {}, pagination = {}) {
    let list = Object.values(this.store.refunds);
    if (filter.status) {
      list = list.filter((r) => r.status === filter.status || r.decisionStatus === filter.status);
    }
    if (filter.bookingId) {
      list = list.filter((r) => r.bookingId === filter.bookingId);
    }
    const limit = pagination.limit ? Number(pagination.limit) : 50;
    return {
      items: list.slice(0, limit),
      lastEvaluatedKey: null,
    };
  }

  async updateRefund(refundId, updateData) {
    const refund = await this.getRefund(refundId);
    if (!refund) return null;
    this.store.refunds[refund.id] = {
      ...refund,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    return this.store.refunds[refund.id];
  }

  // --- Travel Catalog (Demo Showcase Inventory) ---

  async getCatalogDestinations(category) {
    let items = Object.values(this.store.catalogDestinations || {});
    if (items.length === 0) {
      items = DEMO_CATALOG_DESTINATIONS;
    }
    if (!category || category.toLowerCase() === 'all') {
      return items;
    }
    return items.filter((d) => d.category && d.category.toLowerCase() === category.toLowerCase());
  }

  async getCatalogTrips(filters = {}) {
    let items = Object.values(this.store.catalogTrips || {});
    if (items.length === 0) {
      items = DEMO_CATALOG_TRIPS;
    }
    const { serviceType, origin, destination } = filters;
    return items.filter((t) => {
      if (serviceType && serviceType.toLowerCase() !== 'all' && t.serviceType?.toLowerCase() !== serviceType.toLowerCase()) {
        return false;
      }
      if (origin && !t.origin?.toLowerCase().includes(origin.toLowerCase()) && !origin.toLowerCase().includes(t.origin?.toLowerCase())) {
        return false;
      }
      if (destination && !t.destination?.toLowerCase().includes(destination.toLowerCase()) && !destination.toLowerCase().includes(t.destination?.toLowerCase())) {
        return false;
      }
      return true;
    });
  }

  async getCatalogTripById(tripId) {
    if (!tripId) return null;
    const clean = tripId.toString().trim().toLowerCase();
    const trips = Object.values(this.store.catalogTrips || {});
    const match = trips.find(
      (t) =>
        t.tripId?.toLowerCase() === clean ||
        t.code?.toLowerCase() === clean ||
        t.flightNo?.toLowerCase() === clean ||
        t.id?.toLowerCase() === clean ||
        t.id?.toLowerCase() === `trip#${t.serviceType}#${clean}`
    );
    if (match) return match;
    return (
      DEMO_CATALOG_TRIPS.find(
        (t) =>
          t.tripId?.toLowerCase() === clean ||
          t.code?.toLowerCase() === clean ||
          t.flightNo?.toLowerCase() === clean ||
          t.id?.toLowerCase() === clean
      ) || null
    );
  }

  async seedCatalogIfEmpty(options = {}) {
    const { onProgress } = options;
    let seededCount = 0;
    let skippedCount = 0;
    if (!this.store.catalogDestinations) this.store.catalogDestinations = {};
    if (!this.store.catalogTrips) this.store.catalogTrips = {};

    for (let i = 0; i < DEMO_CATALOG_DESTINATIONS.length; i++) {
      const d = DEMO_CATALOG_DESTINATIONS[i];
      if (!this.store.catalogDestinations[d.destinationId]) {
        this.store.catalogDestinations[d.destinationId] = { ...d };
        seededCount++;
        if (onProgress) onProgress({ type: 'destination', index: i + 1, total: DEMO_CATALOG_DESTINATIONS.length, id: d.id, status: 'INSERTED' });
      } else {
        skippedCount++;
        if (onProgress) onProgress({ type: 'destination', index: i + 1, total: DEMO_CATALOG_DESTINATIONS.length, id: d.id, status: 'ALREADY_EXISTS' });
      }
    }

    for (let i = 0; i < DEMO_CATALOG_TRIPS.length; i++) {
      const t = DEMO_CATALOG_TRIPS[i];
      if (!this.store.catalogTrips[t.tripId]) {
        this.store.catalogTrips[t.tripId] = { ...t };
        seededCount++;
        if (onProgress) onProgress({ type: 'trip', index: i + 1, total: DEMO_CATALOG_TRIPS.length, id: t.id, status: 'INSERTED' });
      } else {
        skippedCount++;
        if (onProgress) onProgress({ type: 'trip', index: i + 1, total: DEMO_CATALOG_TRIPS.length, id: t.id, status: 'ALREADY_EXISTS' });
      }
    }

    return {
      success: true,
      seededCount,
      skippedCount,
      errors: [],
      totalDestinations: DEMO_CATALOG_DESTINATIONS.length,
      totalTrips: DEMO_CATALOG_TRIPS.length,
    };
  }

  async _reset() {
    this.store = {
      bookings: {},
      orders: {},
      payments: {},
      processedWebhooks: {},
      refunds: {},
      catalogDestinations: {},
      catalogTrips: {},
    };
    for (const d of DEMO_CATALOG_DESTINATIONS) {
      this.store.catalogDestinations[d.destinationId] = { ...d };
    }
    for (const t of DEMO_CATALOG_TRIPS) {
      this.store.catalogTrips[t.tripId] = { ...t };
    }
  }
}

/**
 * Repository Factory.
 * If isTest is true or NODE_ENV === 'test', returns an isolated InMemoryTestRepository instance.
 * Otherwise returns the production DynamoDBRepository instance.
 * Consistent API: Accepts (options = {}) or (filePath, options = {})
 */
export function createRepository(arg1 = {}, arg2 = {}) {
  let options = {};
  if (typeof arg1 === 'string') {
    options = typeof arg2 === 'object' && arg2 !== null ? { ...arg2, testDataFile: arg1 } : { testDataFile: arg1 };
  } else if (typeof arg1 === 'object' && arg1 !== null) {
    options = arg1;
  }

  if (options.isTest || options.testDataFile || process.env.NODE_ENV === 'test') {
    return new InMemoryTestRepository(options);
  }

  return new DynamoDBRepository(options);
}

// Backward-compatible alias
export const createDatabase = createRepository;

// Production singleton connected to DynamoDB tables
export const db = createRepository();
export default db;
