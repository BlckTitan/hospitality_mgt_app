import { useMutation } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from "react-bootstrap";
import { useState, useEffect } from "react";
import { api } from "../../../../../convex/_generated/api";
import { formSchema } from "./validation";
import InputComponent from "../../../../../shared/input";

type FormData = {
  name: string;
  description?: string;
  maxOccupancy: number;
  baseRate: number;
  amenities: string[];
  isActive: boolean;
};

interface EditRoomTypeFormProps {
  roomTypeData: any;
  onSuccess: () => void;
  onClose: () => void;
  roomTypeId: string;
}

export function EditFormComponent({ roomTypeData, onSuccess, onClose, roomTypeId }: EditRoomTypeFormProps) {
  const updateRoomType = useMutation(api.roomTypes.updateRoomType);
  const [amenities, setAmenities] = useState<string[]>(roomTypeData?.amenities || []);
  const [amenityInput, setAmenityInput] = useState('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      name: roomTypeData?.name || '',
      description: roomTypeData?.description || '',
      maxOccupancy: roomTypeData?.maxOccupancy || 1,
      baseRate: roomTypeData?.baseRate || 0,
      amenities: roomTypeData?.amenities || [],
      isActive: roomTypeData?.isActive ?? true,
    },
  });

  useEffect(() => {
    setAmenities(roomTypeData?.amenities || []);
  }, [roomTypeData]);

  const handleAddAmenity = () => {
    if (amenityInput.trim()) {
      setAmenities((prev) => [...prev, amenityInput.trim()]);
      setAmenityInput('');
    }
  };

  const handleRemoveAmenity = (index: number) => {
    setAmenities((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const response = await updateRoomType({
        roomTypeId: roomTypeId as any,
        name: data.name,
        description: data.description,
        maxOccupancy: data.maxOccupancy,
        baseRate: data.baseRate,
        amenities: amenities,
        isActive: data.isActive,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success('Room type updated successfully!');
        reset();
        setTimeout(() => {
          onSuccess();
          window.location.href = '/admin/room-management/room-type';
        }, 1500);
      }
    } catch (error: any) {
      console.error('Update room type failed:', error);
      toast.error('Failed to update room type. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="editRoomTypeForm">
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <InputComponent
          id="name"
          label="Room Type Name *"
          type="text"
          inputWidth="w-full"
          register={register('name', { required: true })}
          error={errors.name}
        />
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="w-full">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            className="w-full border rounded p-2"
            placeholder="Enter room type description (optional)"
          />
          {errors.description && <span className="text-red-500 text-sm">{errors.description.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="maxOccupancy"
            label="Maximum Occupancy *"
            type="number"
            inputWidth="w-full"
            register={register('maxOccupancy', { valueAsNumber: true })}
            error={errors.maxOccupancy}
          />
        </div>
        <div className="flex-1">
          <InputComponent
            id="baseRate"
            label="Base Rate *"
            type="number"
            inputWidth="w-full"
            register={register('baseRate', { valueAsNumber: true })}
            error={errors.baseRate}
          />
        </div>
      </div>

      <div className="w-full mb-4">
        <label className="block mb-2 font-semibold text-sm">Amenities</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={amenityInput}
            onChange={(e) => setAmenityInput(e.target.value)}
            placeholder="Add amenity (e.g., WiFi, TV, Mini Bar)"
            className="flex-1 border rounded p-2 text-sm"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddAmenity();
              }
            }}
          />
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleAddAmenity}
            type="button"
          >
            Add
          </Button>
        </div>
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {amenities.map((amenity, index) => (
              <div
                key={index}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
              >
                {amenity}
                <button
                  type="button"
                  onClick={() => handleRemoveAmenity(index)}
                  className="text-blue-800 hover:text-blue-600 font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
        <label className="flex !items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('isActive')}
            defaultChecked={roomTypeData?.isActive ?? true}
            className="mr-2 !w-4 !h-3"
          />
          <span className='p-1 ml-2'>Active</span>
        </label>
        <span className="text-sm text-gray-500">Inactive room types cannot be used for new bookings</span>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          Update Room Type
        </Button>
      </div>
    </form>
  );
}
