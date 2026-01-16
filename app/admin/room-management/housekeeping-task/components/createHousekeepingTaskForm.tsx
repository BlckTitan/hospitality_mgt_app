'use client';

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { toast } from "sonner";
import InputComponent from "../../../../../shared/input";
import { Button, Modal } from "react-bootstrap";
import { Id } from "../../../../../convex/_generated/dataModel";

type FormData = {
  roomId: string;
  assignedTo?: string;
  taskType: 'checkout' | 'stayover' | 'deep-clean' | 'inspection';
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt?: string;
  estimatedDuration?: number;
  notes?: string;
};

export function FormComponent({ onSuccess, onClose, propertyId }: { onSuccess?: () => void; onClose?: () => void; propertyId: string }) {
  const createTask = useMutation(api.housekeepingTasks.createHousekeepingTask);
  const roomsResponse = useQuery(api.rooms.getAllRooms, { propertyId: propertyId as Id<'properties'> });
  
  const rooms = roomsResponse?.data || [];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      roomId: '',
      assignedTo: '',
      taskType: 'checkout',
      status: 'pending',
      priority: 'medium',
      scheduledAt: '',
      estimatedDuration: undefined,
      notes: '',
    },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const scheduledAtTimestamp = data.scheduledAt ? new Date(data.scheduledAt).getTime() : undefined;

      const response = await createTask({
        propertyId: propertyId as Id<'properties'>,
        roomId: data.roomId as Id<'rooms'>,
        assignedTo: data.assignedTo ? (data.assignedTo as Id<'staffs'>) : undefined,
        taskType: data.taskType,
        status: data.status,
        priority: data.priority,
        scheduledAt: scheduledAtTimestamp,
        estimatedDuration: data.estimatedDuration,
        notes: data.notes || undefined,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success("Housekeeping task created successfully!");
        console.log("Task created with ID:", response.id);

        if (onSuccess) onSuccess();
        if (onClose) onClose();

        setTimeout(() => {
          window.location.href = "/admin/room-management/housekeeping-task";
        }, 2000);
      }
    } catch (error: any) {
      console.error("Add new housekeeping task failed:", error);
      toast.error("Failed to add new housekeeping task. Please try again.");
    }
  };

  const taskTypeOptions = [
    { value: 'checkout', label: 'Checkout' },
    { value: 'stayover', label: 'Stayover' },
    { value: 'deep-clean', label: 'Deep Clean' },
    { value: 'inspection', label: 'Inspection' },
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'skipped', label: 'Skipped' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const availableRooms = rooms.filter((room: any) => room.isActive);

  const roomOptions = availableRooms.map((room: any) => ({
    value: room._id,
    label: `${room.roomNumber}${room.roomType ? ` - ${room.roomType.name}` : ''} (${room.status})`,
  }));

  // Note: Staff options would need to be fetched from a staff API
  // For now, we'll make it optional
  const staffOptions: { value: string; label: string }[] = [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='createHousekeepingTaskForm'>
      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="roomId" className="block mb-2">Room *</label>
          <select
            id="roomId"
            {...register('roomId', { required: true })}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option disabled value="">Select a room</option>
            {roomOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.roomId && <span className="text-red-500 text-sm">{errors.roomId.message}</span>}
        </div>
        <div className="flex-1">
          <label htmlFor="assignedTo" className="block mb-2">Assigned To</label>
          <select
            id="assignedTo"
            {...register('assignedTo')}
            className="w-full border rounded p-2"
            defaultValue=""
          >
            <option value="">Unassigned</option>
            {staffOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.assignedTo && <span className="text-red-500 text-sm">{errors.assignedTo.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="taskType" className="block mb-2">Task Type *</label>
          <select
            id="taskType"
            {...register('taskType', { required: true })}
            className="w-full border rounded p-2"
            defaultValue="checkout"
          >
            {taskTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.taskType && <span className="text-red-500 text-sm">{errors.taskType.message}</span>}
        </div>
        <div className="flex-1">
          <label htmlFor="status" className="block mb-2">Status *</label>
          <select
            id="status"
            {...register('status', { required: true })}
            className="w-full border rounded p-2"
            defaultValue="pending"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.status && <span className="text-red-500 text-sm">{errors.status.message}</span>}
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <label htmlFor="priority" className="block mb-2">Priority *</label>
          <select
            id="priority"
            {...register('priority', { required: true })}
            className="w-full border rounded p-2"
            defaultValue="medium"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.priority && <span className="text-red-500 text-sm">{errors.priority.message}</span>}
        </div>
        <div className="flex-1">
          <InputComponent
            id="scheduledAt"
            label="Scheduled At"
            type="datetime-local"
            inputWidth="w-full"
            register={register('scheduledAt')}
            error={errors.scheduledAt}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
        <div className="flex-1">
          <InputComponent
            id="estimatedDuration"
            label="Estimated Duration (minutes)"
            type="number"
            inputWidth="w-full"
            register={register('estimatedDuration', { valueAsNumber: true })}
            error={errors.estimatedDuration}
          />
        </div>
      </div>

      <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-start lg:items-center gap-1 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start [&_div]:mb-2 lg:[&_div]:mb-0 mb-2 lg:mb-4">
        <div className="w-full">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            className="w-full border rounded p-2"
            placeholder="Enter task notes (optional)"
          />
          {errors.notes && <span className="text-red-500 text-sm">{errors.notes.message}</span>}
        </div>
      </div>

      <Modal.Footer>
        <Button type="submit" variant='dark'>Submit</Button>
      </Modal.Footer>
    </form>
  );
}
