# Food & Beverage Menu Items Implementation

## Overview
Complete FnbMenuItem feature has been implemented following the same architecture pattern as the room-management module. The feature is scoped by property ID and includes full CRUD operations with validation, pagination, and table display.

## Files Created

### 1. Database Schema
**File:** `convex/schema.ts`
- Added `fnbMenuItems` table with the following fields:
  - `propertyId` (FK to properties) - Tenant isolation
  - `name` - Menu item name
  - `description` - Item description
  - `category` - Food category (appetizer, main, dessert, beverage, etc.)
  - `subcategory` - Subcategory (alcoholic, non-alcoholic, etc.)
  - `price` - Selling price
  - `cost` - Cost price (optional)
  - `isAvailable` - Availability status
  - `imageUrl` - Image URL (optional)
  - `preparationTime` - Preparation time in minutes (optional)
  - `isActive` - Active/inactive status
  - `createdAt` & `updatedAt` - Timestamps

- Includes indexes for:
  - `by_propertyId` - Fast property lookup
  - `by_category` - Category-based filtering
  - `by_propertyId_category` - Property + category combined
  - `by_propertyId_isActive` - Active items per property
  - Search index on `name` field

### 2. Convex Backend Functions
**File:** `convex/fnbMenuItems.ts`

Functions implemented:
- **getAllFnbMenuItems(propertyId)** - Fetch all menu items for a property
- **getFnbMenuItem(menuItemId)** - Fetch single menu item by ID
- **createFnbMenuItem(args)** - Create new menu item with validation
- **updateFnbMenuItem(args)** - Update existing menu item
- **deleteFnbMenuItem(menuItemId)** - Delete menu item

All functions include:
- Property isolation (data scoped by propertyId)
- Error handling and logging
- Business logic validation
- Success/failure response handling

### 3. Form Validation
**File:** `app/admin/food-n-beverage/fnb-menu-item/components/validation.tsx`

Validation schema using Yup:
- `name` - 2-100 characters, required
- `description` - Max 500 characters, optional
- `category` - 2-50 characters, required
- `subcategory` - Max 50 characters, optional
- `price` - Non-negative number, required
- `cost` - Non-negative number, optional
- `isAvailable` - Boolean, required
- `imageUrl` - Valid URL format, max 500 characters, optional
- `preparationTime` - 0-999 minutes, optional
- `isActive` - Boolean, required

### 4. Create Component
**File:** `app/admin/food-n-beverage/fnb-menu-item/components/createFnbMenuItemForm.tsx`

Features:
- React Hook Form integration with Yup validation
- Input fields for all menu item properties
- Select dropdowns for availability and active status
- Textarea for description
- Responsive grid layout (1 column on mobile, 2 on desktop)
- Cancel and Create buttons
- Success/error toast notifications
- Auto-refresh on successful creation

### 5. Edit Component
**File:** `app/admin/food-n-beverage/fnb-menu-item/components/editFnbMenuItemForm.tsx`

Features:
- Same form as create component
- Pre-populated with existing menu item data
- Updates via mutation
- Validation applied to all fields
- Duplicate name checking (excluding current item)
- Auto-refresh on successful update

### 6. Table Component
**File:** `app/admin/food-n-beverage/fnb-menu-item/components/fnbMenuItems.tsx`

Features:
- Displays menu items in a table with pagination
- Columns:
  - Name
  - Category
  - Price (formatted as $X.XX)
  - Cost (formatted as $X.XX or N/A)
  - Availability (color-coded badge)
  - Status (Active/Inactive badge)
  - Created At (formatted date)
  - Action (Edit/Delete buttons)
- Delete functionality with confirmation dialog
- Edit links to edit page
- Proper error handling and toast notifications
- Responsive design

### 7. Main Page
**File:** `app/admin/food-n-beverage/fnb-menu-item/page.tsx`

Features:
- Header with title and "Add New" button
- Modal-based form for creating new menu items
- Integrates FnbMenuItems component for table display
- Property selection/isolation
- Automatic property detection from first available property

### 8. Edit Page
**File:** `app/admin/food-n-beverage/fnb-menu-item/edit/page.tsx`

Features:
- Query parameter `menu_item_id` to identify menu item
- Fetches menu item data on page load
- Modal-based form for editing
- Back link to menu items list
- Error handling for missing items
- Automatic page refresh after successful update

## Directory Structure
```
app/admin/food-n-beverage/
└── fnb-menu-item/
    ├── page.tsx (Main page with create modal)
    ├── components/
    │   ├── validation.tsx (Form validation schema)
    │   ├── createFnbMenuItemForm.tsx (Create form)
    │   ├── editFnbMenuItemForm.tsx (Edit form)
    │   └── fnbMenuItems.tsx (Table with pagination)
    └── edit/
        └── page.tsx (Edit page)

convex/
├── fnbMenuItems.ts (Backend functions)
└── schema.ts (Updated with fnbMenuItems table)
```

## Features Implemented

✅ **1. CreateFnbMenuItem** - Full form with validation and mutation
✅ **2. EditFnbMenuItem** - Update form with pre-populated data
✅ **3. Validation** - Comprehensive Yup schema for all fields
✅ **4. FnbMenuItem Component** - Table display with edit/delete actions
✅ **5. Edit Page** - Dedicated page for editing items
✅ **6. FnbMenuItem Page** - Main page with create modal
✅ **7. Table with Pagination** - Integrated pagination component for data display
✅ **Property Scoping** - All data isolated by propertyId for multi-tenant support

## Usage

### Create Menu Item
1. Navigate to `/admin/food-n-beverage/fnb-menu-item`
2. Click the "+" button in the header
3. Fill in the form fields
4. Click "Create Menu Item"

### Edit Menu Item
1. Click the edit icon (pencil) next to any menu item in the table
2. Update the form fields
3. Click "Update Menu Item"

### Delete Menu Item
1. Click the delete icon (trash) next to any menu item
2. Confirm the deletion in the dialog

### View Menu Items
- Navigate to `/admin/food-n-beverage/fnb-menu-item`
- Menu items are displayed in a table with pagination
- Data is automatically scoped to the current property

## Integration Points

The implementation seamlessly integrates with existing systems:
- Uses existing `api.property.getAllProperties` for property management
- Follows the same pattern as room-management module
- Uses shared components: `InputComponent`, `PaginationComponent`, `BootstrapModal`, `TableColumn`
- Integrates with `convex/react` for data fetching and mutations
- Uses `react-hook-form` for form management
- Uses `sonner` for toast notifications
- Uses `react-icons` for UI icons

## Notes

- All menu items are scoped to a specific property using `propertyId`
- Deletion includes confirmation dialog for safety
- Forms include comprehensive validation before submission
- Table columns are responsive and mobile-friendly
- Preparation time is stored in minutes
- Price and cost are stored as numbers for calculations
