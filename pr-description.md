# Pull Request

## Description

Implements safe project field management and user profile pictures. Users can add, remove, and rename project fields without breaking historical entries or computed values. Profile picture support includes validated base64 uploads with client and server-side security checks.

## Related Issue

Closes #106

## Changes Made

- **Field management**: Added `projectFieldsService.js` with transactional field sync using soft-delete (archival) pattern to preserve historical data while allowing add/remove/rename operations
- **Formula stability**: Extended `computedFieldService.js` to bind formulas to stable field UUIDs, preventing breakage when fields are renamed
- **Profile pictures**: Implemented avatar upload with client-side image reading (`profilePicture.js`) and server-side validation (`profileAvatar.js`) supporting PNG, JPEG, and WebP with 512 KiB limit and magic signature verification
- **UI updates**: Refactored `EditProjectModal.jsx` to allow editing all fields (previously locked), added `ProfileAvatar.jsx` component, and updated `Profile.jsx` with picture upload interface
- **Historical rendering**: Updated `projectDetailsService.js` to include archived field definitions so old entries display their original field structure

## Testing

- [x] Tested locally
- [x] Existing functionality still works
- [x] Added/updated tests where necessary

## Requirements / Acceptance Criteria

- [x] All relevant acceptance criteria have been met
- [x] The implementation matches the related issue/user story

## Code Quality

- [x] Code follows the project's coding and naming conventions
- [x] No unnecessary code or files were added
- [x] ESLint/formatting checks pass

## Documentation

- [x] Documentation has been updated if necessary
- [x] Any important design/implementation decisions have been documented

## Review Checklist

- [x] I have reviewed my own changes
- [x] I understand the code I have submitted
- [x] The changes are ready for review

---

**Test coverage**: 152 tests passing (58 field operations + 46 profile pictures backend + 20 client-side + 28 existing)
