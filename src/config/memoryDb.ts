import { initialUsers, initialProducts, initialWallets, initialTickets, initialSwaps, initialAuctions, initialSecurityAlerts, initialLogs } from '../data';

// Keep a global or static in-memory store for each model collection
const memoryStore = new Map<string, any[]>();

// Flag to track whether MongoDB is successfully connected or offline
let useMemoryFallbackFlag = true;

export function setUseMemoryFallback(val: boolean) {
  useMemoryFallbackFlag = val;
  if (val) {
    console.log('[SkyMarket MemoryDB] Active: Database operations are routed to local in-memory fallback.');
    initializeMemoryCollections();
  } else {
    console.log('[SkyMarket MemoryDB] Standby: Connected directly to MongoDB. Live database is active.');
  }
}

export function isUsingMemoryFallback(): boolean {
  return useMemoryFallbackFlag;
}

// Map collections to default setups
function initializeMemoryCollections() {
  if (memoryStore.size > 0) return; // already initialized

  console.log('[SkyMarket MemoryDB] Loading initial dataset streams into sandbox memory...');

  // Seed baseline data
  memoryStore.set('User', JSON.parse(JSON.stringify(initialUsers)).map((u: any) => ({
    ...u,
    joinedDate: u.joinedDate || new Date().toISOString().substring(0, 10),
    isBanned: false,
    warnings: [],
    commissionPercentage: null,
    allowWithdrawals: true,
    sellerLevel: 'Standard'
  })));

  memoryStore.set('Product', JSON.parse(JSON.stringify(initialProducts)).map((p: any) => ({
    ...p,
    viewsCount: p.viewsCount || 0,
    reportsCount: p.reportsCount || 0,
    isTrend: !!p.isTrend,
    isFeatured: !!p.isFeatured,
    isHidden: !!p.isHidden,
    discountPercentage: p.discountPercentage || 0,
    credentials: p.credentials || {
      email: 'sample@skymarket.vip',
      password: 'password_demo_123',
      username: 'demo_user',
      phone: '+213555123456',
      notes: 'هذه معلومات بيانات الحساب المؤمن تلقائياً.',
      extra: 'تأكد من تغيير الرمز السري بعد الشراء مباشرة.'
    },
    hasCredentials: true,
    isApproved: true
  })));

  memoryStore.set('Wallet', JSON.parse(JSON.stringify(initialWallets)));
  
  memoryStore.set('EscrowTicket', JSON.parse(JSON.stringify(initialTickets)).map((t: any) => ({
    ...t,
    createdAt: t.createdAt || new Date().toISOString(),
    messages: t.messages || [],
    buyerConfirmed: !!t.buyerConfirmed,
    sellerConfirmed: !!t.sellerConfirmed
  })));

  memoryStore.set('Swap', JSON.parse(JSON.stringify(initialSwaps)).map((s: any) => ({
    ...s,
    createdAt: s.createdAt || new Date().toLocaleDateString('ar-DZ')
  })));

  memoryStore.set('Auction', JSON.parse(JSON.stringify(initialAuctions)).map((a: any) => ({
    ...a,
    createdAt: a.createdAt || new Date().toISOString(),
    isCompleted: !!a.isCompleted
  })));

  memoryStore.set('SecurityAlert', JSON.parse(JSON.stringify(initialSecurityAlerts)).map((a: any) => ({
    ...a,
    timestamp: a.timestamp || new Date().toISOString(),
    status: a.status || 'new'
  })));

  memoryStore.set('SystemLog', JSON.parse(JSON.stringify(initialLogs)).map((l: any) => ({
    ...l,
    timestamp: l.timestamp || new Date().toISOString()
  })));

  memoryStore.set('Settings', [{
    generalCommission: 10,
    escrowAutoReleaseHrs: 72,
    maintenanceMode: false,
    acceptedPaymentMethods: ['BaridiMob', 'CCP', 'USDT', 'Flexy', 'Binance'],
    categories: ['game_account', 'subscription', 'digital_service', 'game_currency', 'social_media', 'design_dev', 'swap_item'],
    limits: { minTx: 1, maxTx: 5000 }
  }]);

  console.log('[SkyMarket MemoryDB] Hydration of local collections catalog succeeded.');
}

function getCollectionStore(collectionName: string): any[] {
  initializeMemoryCollections();
  let store = memoryStore.get(collectionName);
  if (!store) {
    store = [];
    memoryStore.set(collectionName, store);
  }
  return store;
}

// Matchers supporting regex, nested logic, and array inclusions
function matchesFilter(doc: any, filter: any): boolean {
  if (!filter) return true;
  for (const key of Object.keys(filter)) {
    const val = filter[key];

    if (key === '$or') {
      if (Array.isArray(val)) {
        const matchesAny = val.some(subFilter => matchesFilter(doc, subFilter));
        if (!matchesAny) return false;
      }
      continue;
    }

    if (val && typeof val === 'object' && !(val instanceof RegExp)) {
      if ('$in' in val) {
        if (!Array.isArray(val.$in) || !val.$in.includes(doc[key])) {
          return false;
        }
      } else {
        if (JSON.stringify(doc[key]) !== JSON.stringify(val)) {
          return false;
        }
      }
    } else if (val instanceof RegExp) {
      if (typeof doc[key] !== 'string' || !val.test(doc[key])) {
        return false;
      }
    } else {
      if (doc[key] !== val) {
        return false;
      }
    }
  }
  return true;
}

// Safe update values helper
function applyUpdate(doc: any, update: any) {
  if (!update) return;

  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      doc[k] = v;
    }
  }

  if (update.$push) {
    for (const [k, v] of Object.entries(update.$push)) {
      if (!Array.isArray(doc[k])) {
        doc[k] = [];
      }
      if (v && typeof v === 'object' && '$each' in v) {
        doc[k].push(...(v.$each as any));
      } else {
        doc[k].push(v);
      }
    }
  }

  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      doc[k] = (doc[k] || 0) + (v as number);
    }
  }

  // Handle direct properties edit
  for (const [k, v] of Object.entries(update)) {
    if (k !== '$set' && k !== '$push' && k !== '$inc') {
      doc[k] = v;
    }
  }
}

// Wraps returned item with a save() method
function wrapDocument(collectionName: string, item: any) {
  if (!item) return null;

  // Clone item
  const doc = { ...item };

  doc.save = async function() {
    const store = getCollectionStore(collectionName);
    const keyField = collectionName === 'Wallet' ? 'userId' : 'id';
    const key = doc[keyField];

    const idx = store.findIndex((x: any) => x[keyField] === key);
    if (idx !== -1) {
      store[idx] = { ...doc };
    } else {
      store.push({ ...doc });
    }
    return doc;
  };

  return doc;
}

function makeThenableQuery(results: any) {
  const promise = Promise.resolve(results);
  let resolvedResult = results;

  const queryObj: any = {
    then: (onfulfilled: any, onrejected: any) => {
      return promise.then((res) => {
        return onfulfilled ? onfulfilled(resolvedResult) : res;
      }, onrejected);
    },
    catch: (onrejected: any) => {
      return promise.catch(onrejected);
    },
    finally: (onfinally: any) => {
      return promise.finally(onfinally);
    },
    select: function(fields: string) {
      if (typeof fields === 'string' && fields.startsWith('-') && Array.isArray(resolvedResult)) {
        const fieldToRemove = fields.substring(1);
        resolvedResult = resolvedResult.map((item: any) => {
          if (item) {
            const copy = { ...item };
            delete copy[fieldToRemove];
            return copy;
          }
          return item;
        });
      }
      return queryObj;
    },
    sort: function(sortObj: any) {
      if (Array.isArray(resolvedResult) && sortObj) {
        const keys = Object.keys(sortObj);
        if (keys.length > 0) {
          const key = keys[0];
          const dir = sortObj[key] === -1 ? -1 : 1;
          resolvedResult = [...resolvedResult].sort((a: any, b: any) => {
            const valA = a[key];
            const valB = b[key];
            if (valA === undefined && valB === undefined) return 0;
            if (valA === undefined) return 1 * dir;
            if (valB === undefined) return -1 * dir;
            if (valA < valB) return -1 * dir;
            if (valA > valB) return 1 * dir;
            return 0;
          });
        }
      }
      return queryObj;
    },
    skip: function(num: number) {
      if (Array.isArray(resolvedResult)) {
        resolvedResult = resolvedResult.slice(num);
      }
      return queryObj;
    },
    limit: function(num: number) {
      if (Array.isArray(resolvedResult)) {
        resolvedResult = resolvedResult.slice(0, num);
      }
      return queryObj;
    }
  };

  queryObj[Symbol.toStringTag] = 'Promise';
  return queryObj;
}

function makeThenableDocument(doc: any) {
  const promise = Promise.resolve(doc);

  const queryObj: any = {
    then: (onfulfilled: any, onrejected: any) => {
      return promise.then((res) => {
        return onfulfilled ? onfulfilled(doc) : res;
      }, onrejected);
    },
    catch: (onrejected: any) => {
      return promise.catch(onrejected);
    },
    finally: (onfinally: any) => {
      return promise.finally(onfinally);
    },
    select: function(fields: string) {
      if (doc && typeof fields === 'string' && fields.startsWith('-')) {
        const fieldToRemove = fields.substring(1);
        delete doc[fieldToRemove];
      }
      return queryObj;
    }
  };

  queryObj[Symbol.toStringTag] = 'Promise';
  return queryObj;
}

// Fallback Model proxy factory
export function createMemoryModelProxy(collectionName: string, mongooseModel: any): any {
  return new Proxy(mongooseModel, {
    get(target, prop, receiver) {
      if (useMemoryFallbackFlag) {
        // Intercept properties with client fallback functions
        if (prop === 'find') {
          return (filter: any) => {
            const store = getCollectionStore(collectionName);
            const matched = store.filter(doc => matchesFilter(doc, filter))
                                 .map(doc => wrapDocument(collectionName, doc));
            return makeThenableQuery(matched);
          };
        }

        if (prop === 'findOne') {
          return (filter: any) => {
            const store = getCollectionStore(collectionName);
            const item = store.find(doc => matchesFilter(doc, filter));
            const wrapped = item ? wrapDocument(collectionName, item) : null;
            return makeThenableDocument(wrapped);
          };
        }

        if (prop === 'create') {
          return async (data: any) => {
            const store = getCollectionStore(collectionName);
            const keyField = collectionName === 'Wallet' ? 'userId' : 'id';
            const key = data[keyField] || `id_${Date.now()}`;
            
            const doc = {
              ...data,
              [keyField]: key,
              createdAt: data.createdAt || new Date().toISOString()
            };

            store.push(doc);
            return wrapDocument(collectionName, doc);
          };
        }

        if (prop === 'updateOne') {
          return async (filter: any, update: any) => {
            const store = getCollectionStore(collectionName);
            const item = store.find(doc => matchesFilter(doc, filter));
            if (item) {
              applyUpdate(item, update);
              return { matchedCount: 1, modifiedCount: 1, acknowledged: true };
            }
            return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
          };
        }

        if (prop === 'updateMany') {
          return async (filter: any, update: any) => {
            const store = getCollectionStore(collectionName);
            const items = store.filter(doc => matchesFilter(doc, filter));
            items.forEach(item => applyUpdate(item, update));
            return { matchedCount: items.length, modifiedCount: items.length, acknowledged: true };
          };
        }

        if (prop === 'deleteOne') {
          return async (filter: any) => {
            const store = getCollectionStore(collectionName);
            const idx = store.findIndex(doc => matchesFilter(doc, filter));
            if (idx !== -1) {
              store.splice(idx, 1);
              return { deletedCount: 1, acknowledged: true };
            }
            return { deletedCount: 0, acknowledged: true };
          };
        }

        if (prop === 'countDocuments') {
          return async (filter: any) => {
            const store = getCollectionStore(collectionName);
            const count = store.filter(doc => matchesFilter(doc, filter)).length;
            return count;
          };
        }

        if (prop === 'insertMany') {
          return async (arr: any[]) => {
            const store = getCollectionStore(collectionName);
            const wrappedArr: any[] = [];
            
            for (const item of arr) {
              store.push(item);
              wrappedArr.push(wrapDocument(collectionName, item));
            }
            return wrappedArr;
          };
        }

        if (prop === 'findByIdAndUpdate') {
          return async (id: string, update: any, options?: any) => {
            const store = getCollectionStore(collectionName);
            const keyField = collectionName === 'Wallet' ? 'userId' : 'id';
            const item = store.find(doc => doc[keyField] === id);
            if (item) {
              applyUpdate(item, update);
              return wrapDocument(collectionName, item);
            }
            return null;
          };
        }
      }

      // Default to actual mongoose model if online
      return Reflect.get(target, prop, receiver);
    }
  });
}
