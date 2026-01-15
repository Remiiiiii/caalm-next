# License Schema - Fields Kept and Removed

## Fields KEPT from Database (20 fields)

### Required Fields (7):
1. ✅ **licenseExpiryDate** (datetime, required) - Kept, mapped from `expirationDate` in code
2. ✅ **licenseName** (string, required) - Kept
3. ✅ **licenseNumber** (string, required) - Kept
4. ✅ **licenseType** (string, required) - Kept
5. ✅ **issuingAuthority** (string, required) - Kept, added to code
6. ✅ **issueDate** (datetime, required) - Kept, mapped from `purchaseDate` in code
7. ✅ **status** (enum, required) - Kept, enum values merged

### Optional Fields (13):
8. ✅ **compliance** (enum, optional) - Kept, added to code
9. ✅ **division** (enum, optional) - Kept, mapped from `department` in code
10. ✅ **assignedManagers** (string array, optional) - Kept, mapped from `assignedTo` in code
11. ✅ **description** (string, optional) - Kept
12. ✅ **licenseUrl** (url, optional) - Kept, added to code
13. ✅ **fileId** (string, optional) - Kept, mapped from `certificateFileId` in code
14. ✅ **renewalDate** (datetime, optional) - Kept
15. ✅ **daysUntilExpiry** (integer, optional) - Kept (calculated)
16. ✅ **allowsReproduction** (boolean, optional) - Kept, added to code
17. ✅ **allowsDistribution** (boolean, optional) - Kept, added to code
18. ✅ **allowsCommercialUse** (boolean, optional) - Kept, added to code
19. ✅ **requiresAttribution** (boolean, optional) - Kept, added to code
20. ✅ **fileRef** (relationship, optional) - Kept, added to code

## Fields KEPT from Code (18 fields)

### Software License Fields (9):
1. ✅ **vendor** (string, optional) - Kept, added to database
2. ✅ **product** (string, optional) - Kept, added to database
3. ✅ **category** (enum, optional) - Kept, added to database
4. ✅ **quantity** (integer, optional) - Kept, added to database
5. ✅ **availableQuantity** (integer, optional) - Kept, added to database
6. ✅ **cost** (float, optional) - Kept, added to database
7. ✅ **currencyCode** (string, optional) - Kept, added to database
8. ✅ **autoRenew** (boolean, optional) - Kept, added to database
9. ✅ **renewalNoticeDays** (integer, optional) - Kept, added to database

### Organization/Assignment Fields (4):
10. ✅ **assignedDepartments** (string array, optional) - Kept, added to database
11. ✅ **licenseOwnerId** (string, optional) - Kept, added to database
12. ✅ **subDepartment** (string, optional) - Kept, added to database
13. ✅ **businessUnit** (string, optional) - Kept, added to database

### Metadata Fields (5):
14. ✅ **tags** (string array, optional) - Kept, added to database
15. ✅ **notes** (string, optional) - Kept, added to database
16. ✅ **relatedContractId** (string, optional) - Kept, added to database
17. ✅ **attachmentReferences** (string array, optional) - Kept, added to database
18. ✅ **renewalHistory** (array, optional) - Kept (stored as JSON in database)

## Fields REMOVED

### From Database:
- ❌ **None** - All database fields are useful and kept

### From Code:
- ❌ **None** - All code fields are useful and kept

## Field Name Changes (Mapped, Not Removed)

These fields were renamed to match database schema, but functionality is preserved through mapping:

1. `expirationDate` → `licenseExpiryDate` (mapped in service layer)
2. `purchaseDate` → `issueDate` (mapped in service layer)
3. `assignedTo` → `assignedManagers` (mapped in service layer)
4. `certificateFileId` → `fileId` (mapped in service layer)
5. `department` → `division` (mapped in service layer, both supported)

## Status Enum Changes

### Before (Code):
- `['active', 'expired', 'pending_renewal', 'suspended', 'archived']`

### Before (Database):
- `['active', 'inactive', 'pending-review', 'action-required']`

### After (Unified):
- `['active', 'inactive', 'expired', 'pending-review', 'pending_renewal', 'suspended', 'archived', 'action-required']`

**All values from both sources are kept and merged.**

## Summary

- **Total fields in unified schema:** 38 fields
- **Fields from database:** 20 (all kept)
- **Fields from code:** 18 (all kept)
- **Fields removed:** 0
- **Fields renamed/mapped:** 5 (preserved through service layer mapping)

The unified schema combines the best of both sources with no data loss. All fields are preserved and accessible through automatic field mapping in the `LicenseService`.
