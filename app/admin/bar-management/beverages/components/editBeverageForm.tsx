'use client';
import { goToList } from '../../../../../shared/goToList';

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { BeverageCategoryField } from "./beverageCategoryField";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from '../../../../../shared/button';
import InputComponent from "../../../../../shared/input";
import ImageUpload from "../../../../../shared/imageUpload";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { BeverageCostFields, recipeLinesPayload, type RecipeLineDraft } from "./beverageCostFields";

type FormData = {
  name: string;
  category: string;
  unitOfMeasure: string;
  size: string;
  unitPrice: number;
  unitsPerPack?: number;
  manualUnitCost?: number;
  reorderLevel: number;
  isActive: boolean;
  imageUrl: string;
};

interface EditBeverageFormProps {
  beverageData: any;
  beverageId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function EditBeverageForm({ beverageData, beverageId, onSuccess, onClose }: EditBeverageFormProps) {
  const updateBeverage = useMutation(api.beverages.updateBeverage);
  const catalog = useQuery(
    api.beverages.getCostCatalog,
    beverageData.propertyId ? { propertyId: beverageData.propertyId as Id<'properties'> } : 'skip',
  );
  const [inventoryItemId, setInventoryItemId] = useState(beverageData.inventoryItemId || '');
  const [recipeLines, setRecipeLines] = useState<RecipeLineDraft[]>(
    (beverageData.recipeLines ?? []).map((line: any) => ({
      key: line._id,
      inventoryItemId: line.inventoryItemId,
      quantity: String(line.quantity ?? 1),
      wastePercent: line.wastePercent != null ? String(line.wastePercent) : '',
    })),
  );
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      name: beverageData.name || '',
      category: beverageData.category || 'other',
      unitOfMeasure: beverageData.unitOfMeasure || '',
      size: beverageData.size || '',
      unitPrice: beverageData.unitPrice || 0,
      unitsPerPack: beverageData.unitsPerPack,
      manualUnitCost: beverageData.manualUnitCost,
      reorderLevel: beverageData.reorderLevel || 0,
      isActive: beverageData.isActive ?? true,
      imageUrl: beverageData.imageUrl || '',
    },
  });

  const imageUrl = watch('imageUrl');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateBeverage({
        beverageId: beverageId as Id<'beverages'>,
        name: data.name,
        category: data.category,
        unitOfMeasure: data.unitOfMeasure,
        size: data.size.trim() ? data.size.trim() : null,
        unitPrice: data.unitPrice,
        unitsPerPack: Number.isInteger(data.unitsPerPack) ? data.unitsPerPack : undefined,
        manualUnitCost: Number.isFinite(data.manualUnitCost) ? data.manualUnitCost : undefined,
        inventoryItemId: inventoryItemId ? inventoryItemId as Id<'inventoryItems'> : null,
        recipeLines: recipeLinesPayload(recipeLines),
        reorderLevel: data.reorderLevel,
        isActive: data.isActive,
        imageUrl: data.imageUrl,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Beverage updated successfully!');
        onSuccess();
goToList('/admin/bar-management/beverages');
      }
    } catch (error: any) {
      console.error('Update beverage failed:', error);
      toast.error('Failed to update beverage. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editBeverageForm">
      <div className="w-full h-fit mb-4">
        <ImageUpload
          id="imageUrl"
          label="Beverage image"
          required
          folder="beverages"
          value={imageUrl || null}
          onChange={(url) => setValue('imageUrl', url ?? '', { shouldValidate: true, shouldDirty: true })}
          error={errors.imageUrl}
        />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="name" label="Beverage Name *" type="text" inputWidth="w-full" register={register('name', { required: true })} error={errors.name} />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <BeverageCategoryField
          propertyId={beverageData.propertyId as Id<'properties'> | undefined}
          registration={register('category', { required: true })}
          error={errors.category}
          currentValue={watch('category')}
        />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-4">
        <div className="flex-1">
          <InputComponent id="unitOfMeasure" label="Unit of Measure *" type="text" inputWidth="w-full" register={register('unitOfMeasure', { required: true })} error={errors.unitOfMeasure} />
        </div>
        <div className="flex-1">
          <InputComponent id="size" label="Size *" type="text" inputWidth="w-full" register={register('size', { required: true })} error={errors.size} placeholder="e.g. 330ml, 750ml, 1L" />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="unitPrice" label="Unit Price *" type="number" inputWidth="w-full" register={register('unitPrice', { valueAsNumber: true })} error={errors.unitPrice} />
      </div>

      <div className="w-full mb-4">
        <InputComponent id="unitsPerPack" label="Bottles per crate" type="number" inputWidth="w-full" register={register('unitsPerPack', { valueAsNumber: true })} error={errors.unitsPerPack} placeholder="12" />
        <p className="text-xs text-gray-500 mt-1">A crate bought for 11,000 with 12 bottles costs 11,000 / 12 per bottle, before transport and other supply costs.</p>
      </div>

      <div className="w-full mb-4">
        <InputComponent id="manualUnitCost" label="Manual unit cost" type="number" inputWidth="w-full" register={register('manualUnitCost', { valueAsNumber: true })} error={errors.manualUnitCost} />
        <p className="text-xs text-gray-500 mt-1">Leave blank to use the bottle cost from crate purchases. A number here is used for bar profit instead. A recipe still uses its ingredients.</p>
        {beverageData.manualUnitCost === undefined && beverageData.unitCost !== undefined && beverageData.costSource !== 'purchase' && beverageData.costSource !== 'recipe' && (
          <p className="text-xs text-gray-500 mt-1">A saved cost of {beverageData.unitCost} is still used until a crate purchase or a manual cost replaces it.</p>
        )}
      </div>

      <BeverageCostFields
        catalog={catalog?.data ?? []}
        inventoryItemId={inventoryItemId}
        onInventoryItemIdChange={setInventoryItemId}
        recipeLines={recipeLines}
        onRecipeLinesChange={setRecipeLines}
      />

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 mb-4">
        <InputComponent id="reorderLevel" label="Reorder Level *" type="number" inputWidth="w-full" register={register('reorderLevel', { valueAsNumber: true })} error={errors.reorderLevel} />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('isActive')} defaultChecked={beverageData.isActive ?? true} className="mr-2 w-4 h-3" />
          <span>Active</span>
        </label>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="dark" type="submit">Update Beverage</Button>
      </div>
    </form>
  );
}
