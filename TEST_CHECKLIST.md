# ✅ POST-DEPLOYMENT TEST CHECKLIST

Run these tests AFTER deploying security fixes to verify nothing broke.

## 🔴 CRITICAL TESTS (Must pass before considering deployment successful)

### Test 1: Customer Checkout Flow
**Time**: 3 minutes  
**Test**:
```
1. Go to customer app (hivenow.in or staging)
2. Browse products
3. Add 2 different products to cart
4. View cart - verify totals are correct
5. Click checkout
6. Fill delivery address
7. Review order - verify pricing breakdown
8. Complete payment with test card: 4111 1111 1111 1111
9. Wait for confirmation page
```

**Expected Result**:
- ✅ Payment succeeds
- ✅ Order appears in Convex orders table
- ✅ Stock deducted from products
- ✅ Razorpay shows "captured" status

**If FAILS**: ROLLBACK IMMEDIATELY - checkout is broken

---

### Test 2: Webhook Processing
**Time**: 2 minutes  
**Test**:
```
1. Go to Razorpay Dashboard → Webhooks
2. Find a recent "payment.captured" webhook
3. Click "Replay Webhook"
4. Check response code
```

**Expected Result**:
- ✅ Returns 200 OK (or 400 "duplicate" is also OK)
- ✅ No 500 errors
- ✅ Convex logs show webhook processed (check: npx convex logs)

**If FAILS**: ROLLBACK if webhooks return 500 errors

---

### Test 3: Boutique Login & Dashboard
**Time**: 2 minutes  
**Test**:
```
1. Go to boutique.hivenow.in
2. Login with boutique owner account
3. View dashboard
4. Click "Orders" tab
5. Click "Products" tab
6. Try to edit a product's stock
```

**Expected Result**:
- ✅ Login succeeds (no "Access Denied")
- ✅ Dashboard loads
- ✅ Orders list displays
- ✅ Products list displays
- ✅ Stock edit works

**If FAILS**: ROLLBACK if boutique owners can't access their dashboard

---

### Test 4: Admin Panel Access
**Time**: 1 minute  
**Test**:
```
1. Go to admin.hivenow.in
2. Login with admin account
3. View dashboard
4. Open browser DevTools → Console tab
5. Check for any red errors
```

**Expected Result**:
- ✅ Login succeeds
- ✅ Dashboard loads
- ✅ No CSP (Content Security Policy) errors in console
- ✅ All admin functions accessible

**If FAILS**: Check if CSP headers causing issues - may need adjustment

---

## 🟡 IMPORTANT TESTS (Should pass, but not deployment blockers)

### Test 5: Concurrent Checkout (Race Condition Check)
**Time**: 5 minutes  
**Test**:
```
1. Find product with stock = 1
2. Open customer app in 2 browser windows
3. In both windows simultaneously:
   - Add that product to cart
   - Go to checkout
   - Try to complete payment at same time
```

**Expected Result**:
- ✅ First user succeeds
- ✅ Second user gets "stock conflict" or "out of stock" error
- ✅ NO overselling (check product stock after - should be 0, not negative)

**If FAILS**: Not critical immediately, but monitor for overselling issues

---

### Test 6: Legacy Order Payout
**Time**: 3 minutes  
**Test**:
```
1. In Convex dashboard, find an old order (before today's deployment)
2. Check its pricingSnapshot field
3. If pricingSnapshot is null (legacy order):
   - Note the commission amount
   - Calculate expected payout manually:
     Payout = subtotal - discount - commission - (commission * 0.18)
   - Compare with actual payout in settlementLedger
```

**Expected Result**:
- ✅ GST on commission is properly deducted
- ✅ Seller payout matches formula

**If FAILS**: Old orders may have wrong payouts, but new orders should be correct

---

### Test 7: Rate Limiting (Abuse Prevention)
**Time**: 2 minutes  
**Test**:
```
1. Try to create 15 checkout sessions rapidly (script or manual)
2. Check if rate limit triggers
```

**Expected Result**:
- ✅ After 10 attempts, should see "Rate limit exceeded" error
- ✅ Normal users (1-2 checkouts) not affected

**If FAILS**: Rate limiting not working, but not critical for launch

---

## 🟢 OPTIONAL TESTS (Nice to verify)

### Test 8: Build & TypeScript
**Time**: 5 minutes  
**Test**:
```bash
npm run typecheck
npm run build
```

**Expected Result**:
- ✅ No TypeScript errors
- ✅ All 3 apps build successfully

---

### Test 9: Old Webhook Replay (Timestamp Check)
**Time**: 2 minutes  
**Test**:
```
1. Find a webhook from Razorpay that's >10 minutes old
2. Try to replay it
```

**Expected Result**:
- ✅ Webhook rejected with "expired" or "too old" message
- ✅ Prevents replay attacks

---

## 📊 TEST RESULTS TEMPLATE

Copy this after testing:

```
DEPLOYMENT TEST RESULTS - 2026-08-25
Branch: worktree-security-fixes-audit
Commit: [will be filled after merge]

🔴 CRITICAL TESTS:
[ ] Test 1: Customer Checkout - PASS / FAIL / NOTES: __________
[ ] Test 2: Webhook Processing - PASS / FAIL / NOTES: __________
[ ] Test 3: Boutique Dashboard - PASS / FAIL / NOTES: __________
[ ] Test 4: Admin Panel - PASS / FAIL / NOTES: __________

🟡 IMPORTANT TESTS:
[ ] Test 5: Concurrent Checkout - PASS / FAIL / NOTES: __________
[ ] Test 6: Legacy Payouts - PASS / FAIL / NOTES: __________
[ ] Test 7: Rate Limiting - PASS / FAIL / NOTES: __________

🟢 OPTIONAL TESTS:
[ ] Test 8: Build & TypeScript - PASS / FAIL / NOTES: __________
[ ] Test 9: Old Webhook Replay - PASS / FAIL / NOTES: __________

DEPLOYMENT DECISION:
[ ] ✅ ALL CRITICAL TESTS PASSED - Safe to deploy to production
[ ] ⚠️ SOME TESTS FAILED - Review failures, consider rollback
[ ] 🚨 CRITICAL TESTS FAILED - ROLLBACK IMMEDIATELY

Tested By: __________
Date: 2026-08-25
Time: __________
```

---

## 🚨 FAILURE RESPONSE

If ANY critical test fails:
1. **STOP** - Do not deploy to production
2. **ROLLBACK** - Follow ROLLBACK_GUIDE.md Option 1
3. **DOCUMENT** - Note what failed and error messages
4. **REPORT** - Inform team and this AI assistant
5. **INVESTIGATE** - Debug the specific failure
6. **RETEST** - Fix and run tests again

Remember: **It's better to rollback and fix than to have a broken production system.**
