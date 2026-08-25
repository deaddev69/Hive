# 🚨 EMERGENCY ROLLBACK GUIDE

**Created**: 2026-08-25 14:26 IST  
**Backup Branch**: `backup-before-security-fixes`  
**Original Commit**: Will be recorded below

## ⚡ INSTANT ROLLBACK (If anything breaks)

### Option 1: One-Command Rollback
```bash
# From repository root:
git checkout develop
git reset --hard backup-before-security-fixes
git push origin develop --force-with-lease

# Redeploy Convex:
npx convex deploy --yes
```

### Option 2: Selective Rollback (if only one file broke)
```bash
# Rollback specific file:
git checkout backup-before-security-fixes -- path/to/file.ts

# Commit and deploy:
git add path/to/file.ts
git commit -m "rollback: revert security fix for [file]"
git push origin develop
npx convex deploy --yes
```

### Option 3: Create Revert Commit (preserves history)
```bash
# This creates a new commit that undoes changes:
git checkout develop
git revert HEAD
git push origin develop
npx convex deploy --yes
```

## 📞 Emergency Contacts
- Your Team Lead: [Add contact]
- DevOps On-Call: [Add contact]
- This AI Session: Available for immediate help

## 🔍 How to Check if Rollback is Needed

### Signs Something Broke:
- [ ] Checkout flow fails (test: create order on staging)
- [ ] Payment webhooks failing (check Razorpay dashboard)
- [ ] Boutique login fails
- [ ] Admin panel errors
- [ ] Stock not updating
- [ ] Orders not creating

### Quick Health Check:
```bash
# 1. Check Convex deployment status:
npx convex logs --tail 50

# 2. Check for TypeScript errors:
npm run typecheck

# 3. Check build:
npm run build

# 4. Test critical flow:
# - Go to staging.hivenow.in
# - Add product to cart
# - Proceed to checkout
# - Complete test payment
```

## 📝 What Was Changed

Changes will be documented below as they're made:

f8c6aef098e4b2be0f298422722706cc40729100 - hotfix: revert middleware role checks - live users blocked without Clerk metadata.role - Mon Aug 24 22:50:41 2026 +0530
