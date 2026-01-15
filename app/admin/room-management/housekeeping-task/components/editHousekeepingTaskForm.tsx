import { useMutation, useQuery } from "convex/react";
import { Button } from "react-bootstrap";
import { api } from "../../../../convex/_generated/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { formSchema } from "./validation";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import InputComponent from "../../../../shared/input";

type FormData = {
  id: Id<'housekeepingTasks'>;
  roomId: string;
  assignedTo?: string;
  taskType: 'checkout' | 'stayover' | 'deep-clean' | 'inspection';
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  notes?: string;
};

export function FormComponent({
  id,
  roomId,
  assignedTo,
  taskType,
  status,
  priority,
  scheduledAt,
  startedAt,
  completedAt,
  estimatedDuration,
  actualDuration,
  notes,
  propertyId,
}: {
  id: Id<'housekeepingTasks'>;
  roomId: string;
  assignedTo?: string;
  taskType: string;
  status: string;
  priority: string;
  scheduledAt?: number;
  startedAt?: number;
  completedAt?: number;
  estimatedDuration?: number;
  actualDuration?: number;
  notes?: string;
  propertyId: string;
}) {
  const updateTask = useMutation(api.housekeepingTasks.updateHousekeepingTask);
  const roomsResponse = useQuery(api.rooms.getAllRooms, { propertyId: propertyId as Id<'properties'> });
  
  const rooms = roomsResponse?.data || [];

  const formatDateTimeForInput = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      roomId: roomId,
      assignedTo: assignedTo || '',
      taskType: taskType as 'checkout' | 'stayover' | 'deep-clean' | 'inspection',
      status: status as 'pending' | 'in-progress' | 'completed' | 'skipped',
      priority: priority as 'low' | 'medium' | 'high' | 'urgent',
      scheduledAt: formatDateTimeForInput(scheduledAt),
      startedAt: formatDateTimeForInput(startedAt),
      completedAt: formatDateTimeForInput(completedAt),
      estimatedDuration: estimatedDuration,
      actualDuration: actualDuration,
      notes: notes || '',
    },
  });

  const onSubmit: SubmitHandler<FormData | FieldValues> = async (data) => {
    try {
      const scheduledAtTimestamp = data.scheduledAt ? new Date(data.scheduledAt as string).getTime() : undefined;
      const startedAtTimestamp = data.startedAt ? new Date(data.startedAt as string).getTime() : undefined;
      const completedAtTimestamp = data.completedAt ? new Date(data.completedAt as string).getTime() : undefined;

      const response = await updateTask({
        taskId: id,
        roomId: data.roomId as Id<'rooms'>,
        assignedTo: data.assignedTo ? (data.assignedTo as Id<'staffs'>) : undefined,
        taskType: data.taskType as 'checkout' | 'stayover' | 'deep-clean' | 'inspection',
        status: data.status as 'pending' | 'in-progress' | 'completed' | 'skipped',
        priority: data.priority as 'low' | 'medium' | 'high' | 'urgent',
        scheduledAt: scheduledAtTimestamp,
        startedAt: startedAtTimestamp,
        completedAt: completedAtTimestamp,
        estimatedDuration: data.estimatedDuration,
        actualDuration: data.actualDuration,
        notes: data.notes || undefined,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success("Housekeeping task updated successfully!");
        console.log("Task updated with ID:", response);

        // Redirect to housekeeping task page after submission
        setTimeout(() => {
          window.location.href = "/admin/room-management/housekeeping-task";
        }, 2000);
      }
    } catch (error: any) {
      console.error("Edit housekeeping task failed:", error);
      toast.error("Failed to update housekeeping task. Please try again.");
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

  const staffOptions: { value: string; label: string }[] = []; // TODO: Fetch from staff API

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className='mt-4'>
        <div className="w-full h-fit flex flex-col lg:flex-row lg:justify-between lg:items-start gap-2 mb-2 lg:mb-4">
          <div className="flex-1">
            <label htmlFor="roomId" className="block mb-2">Room *</label>
            <select
              id="roomId"
              {...register('roomId', { required: true })}
              className="w-full border rounded p-2"
            >
              {roomOptions.map((option) => (
                <option key={option.value} value={option.value} selected={option.value === roomId}>
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
            >
              <option value="">Unassigned</option>
              {staffOptions.map((option) => (
                <option key={option.value} value={option.value} selected={option.value === assignedTo}>
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
              id="startedAt"
              label="Started At"
              type="datetime-local"
              inputWidth="w-full"
              register={register('startedAt')}
              error={errors.startedAt}
            />
          </div>
          <div className="flex-1">
            <InputComponent
              id="completedAt"
              label="Completed At"
              type="datetime-local"
              inputWidth="w-full"
              register={register('completedAt')}
              error={errors.completedAt}
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
          <div className="flex-1">
            <InputComponent
              id="actualDuration"
              label="Actual Duration (minutes)"
              type="number"
              inputWidth="w-full"
              register={register('actualDuration', { valueAsNumber: true })}
              error={errors.actualDuration}
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

        <Button type="submit" variant='dark'>Submit</Button>
      </form>
    </>
  );
}
