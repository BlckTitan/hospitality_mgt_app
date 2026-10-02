import { useMutation, useQuery } from "convex/react";
import { SubmitHandler, useForm } from "react-hook-form";
import { formSchema } from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Button } from '../../../../../shared/button';
import { Modal } from '../../../../../shared/modal';
import InputComponent from "../../../../../shared/input";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { formatPropertyMoney, usePropertyCurrency } from "../../../inventory-management/components/money";

type GuestMode = "existing" | "new";

type FormData = {
  guestMode: GuestMode;
  guestId?: string;
  newGuestFirstName?: string;
  newGuestLastName?: string;
  newGuestEmail?: string;
  newGuestPhone?: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  rate: number;
  totalAmount: number;
  depositAmount?: number;
  status: "pending" | "confirmed";
  source?: "direct" | "ota" | "walk-in" | "phone" | "other";
  specialRequests?: string;
};

type GuestHit = {
  _id: Id<"guests">;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
};

function guestLabel(guest: GuestHit) {
  const contact = guest.email || guest.phone;
  return contact
    ? `${guest.firstName} ${guest.lastName} (${contact})`
    : `${guest.firstName} ${guest.lastName}`;
}

export function FormComponent({
  onSuccess,
  onClose,
  propertyId,
  initialGuestId,
}: {
  onSuccess: () => void;
  onClose: () => void;
  propertyId: string;
  initialGuestId?: string | null;
}) {
  const createReservation = useMutation(api.reservations.createReservation);
  const currency = usePropertyCurrency(propertyId);
  const roomsResponse = useQuery(api.rooms.getAllRooms, {
    propertyId: propertyId as Id<"properties">,
  });
  const rooms = roomsResponse?.data || [];

  const [guestSearch, setGuestSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<GuestHit | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [nights, setNights] = useState(1);
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(guestSearch.trim()), 250);
    return () => clearTimeout(t);
  }, [guestSearch]);

  const searchResponse = useQuery(
    api.guests.searchGuests,
    debouncedSearch.length >= 1
      ? {
          propertyId: propertyId as Id<"properties">,
          searchTerm: debouncedSearch,
          limit: 12,
        }
      : "skip",
  );
  const searchHits: GuestHit[] = (searchResponse?.data as GuestHit[] | undefined) || [];

  const prefillGuest = useQuery(
    api.guests.getGuest,
    initialGuestId ? { guestId: initialGuestId as Id<"guests"> } : "skip",
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
    clearErrors,
  } = useForm<FormData>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: {
      guestMode: "existing",
      guestId: "",
      newGuestFirstName: "",
      newGuestLastName: "",
      newGuestEmail: "",
      newGuestPhone: "",
      roomId: "",
      checkInDate: "",
      checkOutDate: "",
      numberOfGuests: 1,
      rate: 0,
      totalAmount: 0,
      depositAmount: 0,
      status: "pending",
      source: "direct",
      specialRequests: "",
    },
  });

  const guestMode = watch("guestMode");
  const watchCheckIn = watch("checkInDate");
  const watchCheckOut = watch("checkOutDate");
  const watchRate = watch("rate");
  const watchRoomId = watch("roomId");

  useEffect(() => {
    if (!prefillGuest?.data || selectedGuest) return;
    const g = prefillGuest.data as GuestHit;
    setSelectedGuest(g);
    setValue("guestMode", "existing");
    setValue("guestId", g._id, { shouldValidate: true });
    setGuestSearch("");
  }, [prefillGuest, selectedGuest, setValue]);

  useEffect(() => {
    if (!watchCheckIn || !watchCheckOut || !watchRate) return;
    const checkIn = new Date(watchCheckIn);
    const checkOut = new Date(watchCheckOut);
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      setNights(diffDays);
      const total = diffDays * watchRate;
      setCalculatedTotal(total);
      setValue("totalAmount", total);
    }
  }, [watchCheckIn, watchCheckOut, watchRate, setValue]);

  useEffect(() => {
    if (!watchRoomId) return;
    const room = rooms.find((r: any) => r._id === watchRoomId);
    if (room?.roomType?.baseRate) {
      setValue("rate", room.roomType.baseRate);
    }
  }, [watchRoomId, rooms, setValue]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!searchWrapRef.current?.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const selectExistingGuest = (guest: GuestHit) => {
    setSelectedGuest(guest);
    setValue("guestMode", "existing");
    setValue("guestId", guest._id, { shouldValidate: true });
    clearErrors("guestId");
    setGuestSearch("");
    setShowResults(false);
  };

  const clearSelectedGuest = () => {
    setSelectedGuest(null);
    setValue("guestId", "", { shouldValidate: true });
  };

  const switchToNewGuest = () => {
    setSelectedGuest(null);
    setValue("guestMode", "new");
    setValue("guestId", "");
    setGuestSearch("");
    setShowResults(false);
    clearErrors(["guestId"]);
  };

  const switchToExistingGuest = () => {
    setValue("guestMode", "existing");
    setValue("newGuestFirstName", "");
    setValue("newGuestLastName", "");
    setValue("newGuestEmail", "");
    setValue("newGuestPhone", "");
    clearErrors(["newGuestFirstName", "newGuestLastName", "newGuestEmail", "newGuestPhone"]);
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const checkInTimestamp = new Date(data.checkInDate).getTime();
      const checkOutTimestamp = new Date(data.checkOutDate).getTime();

      const guestPayload =
        data.guestMode === "new"
          ? {
              newGuest: {
                firstName: data.newGuestFirstName!.trim(),
                lastName: data.newGuestLastName!.trim(),
                email: data.newGuestEmail?.trim() || undefined,
                phone: data.newGuestPhone?.trim() || undefined,
              },
            }
          : { guestId: data.guestId as Id<"guests"> };

      const response = await createReservation({
        propertyId: propertyId as Id<"properties">,
        roomId: data.roomId as Id<"rooms">,
        ...guestPayload,
        checkInDate: checkInTimestamp,
        checkOutDate: checkOutTimestamp,
        numberOfGuests: data.numberOfGuests,
        rate: data.rate,
        totalAmount: data.totalAmount,
        depositAmount: data.depositAmount,
        status: data.status,
        source: data.source,
        specialRequests: data.specialRequests,
      });

      if (response.success === false) {
        toast.error(response.message);
      } else {
        toast.success(
          `Reservation created successfully! Confirmation: ${response.confirmationNumber}`,
        );
        reset();
        setSelectedGuest(null);
        setTimeout(() => {
          onSuccess();
          window.location.href = "/admin/room-management/reservation";
        }, 1500);
      }
    } catch (error: any) {
      console.error("Add new reservation failed:", error);
      toast.error("Failed to add new reservation. Please try again.");
    }
  };

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
  ];

  const sourceOptions = [
    { value: "direct", label: "Direct" },
    { value: "ota", label: "OTA (Online Travel Agency)" },
    { value: "walk-in", label: "Walk-in" },
    { value: "phone", label: "Phone" },
    { value: "other", label: "Other" },
  ];

  const availableRooms = rooms.filter(
    (room: any) =>
      room.isActive && room.status !== "out-of-order" && room.status !== "maintenance",
  );

  const roomOptions = availableRooms.map((room: any) => ({
    value: room._id,
    label: `${room.roomNumber} - ${room.roomType?.name || "N/A"} (${room.status}${
      room.isReady === false ? ", not ready" : ""
    })`,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="createReservationForm">
      <div className="mb-4 w-full rounded border border-gray-200 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label className="block text-sm font-medium">Guest *</label>
          {guestMode === "existing" ? (
            <button
              type="button"
              className="text-sm text-blue-700 underline"
              onClick={switchToNewGuest}
            >
              New guest
            </button>
          ) : (
            <button
              type="button"
              className="text-sm text-blue-700 underline"
              onClick={switchToExistingGuest}
            >
              Search existing guest
            </button>
          )}
        </div>

        {guestMode === "existing" ? (
          <>
            {selectedGuest ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedGuest.firstName} {selectedGuest.lastName}
                  </p>
                  <p className="text-xs text-gray-600">
                    {[selectedGuest.email, selectedGuest.phone].filter(Boolean).join(" · ") ||
                      "No contact on file"}
                  </p>
                </div>
                <Button type="button" variant="outline-secondary" size="sm" onClick={clearSelectedGuest}>
                  Change
                </Button>
              </div>
            ) : (
              <div ref={searchWrapRef} className="relative">
                <input
                  type="search"
                  value={guestSearch}
                  onChange={(e) => {
                    setGuestSearch(e.target.value);
                    setShowResults(true);
                  }}
                  onFocus={() => setShowResults(true)}
                  placeholder="Search by name, email, or phone"
                  className="w-full rounded border p-2"
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={showResults}
                />
                {showResults && debouncedSearch.length >= 1 && (
                  <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border bg-white shadow">
                    {searchResponse === undefined ? (
                      <li className="px-3 py-2 text-sm text-gray-500">Searching…</li>
                    ) : searchHits.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-gray-500">
                        No guests found.{" "}
                        <button
                          type="button"
                          className="text-blue-700 underline"
                          onClick={switchToNewGuest}
                        >
                          Create new guest
                        </button>
                      </li>
                    ) : (
                      searchHits.map((guest) => (
                        <li key={guest._id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                            onClick={() => selectExistingGuest(guest)}
                          >
                            {guestLabel(guest)}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )}
            <input type="hidden" {...register("guestId")} />
            {errors.guestId && (
              <span className="mt-1 block text-sm text-red-500">{errors.guestId.message}</span>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500">
              Creates a guest profile with this booking. Add photo and loyalty details later on Guests.
            </p>
            <div className="flex w-full flex-col gap-1 lg:flex-row lg:justify-between lg:gap-2 [&_div]:mb-0 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start">
              <InputComponent
                id="newGuestFirstName"
                label="First Name *"
                type="string"
                inputWidth="w-1/2"
                placeholder="First name"
                register={register("newGuestFirstName")}
                error={errors.newGuestFirstName}
              />
              <InputComponent
                id="newGuestLastName"
                label="Last Name *"
                type="string"
                inputWidth="w-1/2"
                placeholder="Last name"
                register={register("newGuestLastName")}
                error={errors.newGuestLastName}
              />
            </div>
            <div className="flex w-full flex-col gap-1 lg:flex-row lg:justify-between lg:gap-2 [&_div]:mb-0 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start">
              <InputComponent
                id="newGuestEmail"
                label="Email"
                type="email"
                inputWidth="w-1/2"
                register={register("newGuestEmail")}
                error={errors.newGuestEmail}
              />
              <InputComponent
                id="newGuestPhone"
                label="Phone"
                type="tel"
                inputWidth="w-1/2"
                register={register("newGuestPhone")}
                error={errors.newGuestPhone}
              />
            </div>
          </div>
        )}
        <input type="hidden" {...register("guestMode")} />
      </div>

      <div
        className="mb-2 flex h-fit w-full flex-col gap-1 lg:mb-4 lg:flex-row lg:items-center lg:justify-between
        [&_div]:mb-2 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start lg:[&_div]:mb-0"
      >
        <div className="flex-1">
          <label htmlFor="roomId" className="mb-1 block text-sm font-medium">
            Room *
          </label>
          <select
            id="roomId"
            {...register("roomId", { required: true })}
            className="w-full rounded border p-2"
            defaultValue=""
          >
            <option disabled value="">
              Select a room
            </option>
            {roomOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.roomId && (
            <span className="text-sm text-red-500">{errors.roomId.message}</span>
          )}
        </div>
      </div>

      <div
        className="mb-2 flex h-fit w-full flex-col gap-1 lg:mb-4 lg:flex-row lg:items-center lg:justify-between
        [&_div]:mb-2 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start lg:[&_div]:mb-0"
      >
        <InputComponent
          id="checkInDate"
          label="Check-in Date *"
          type="date"
          inputWidth="w-1/2"
          register={register("checkInDate", { required: true })}
          error={errors.checkInDate}
        />

        <InputComponent
          id="checkOutDate"
          label="Check-out Date *"
          type="date"
          inputWidth="w-1/2"
          register={register("checkOutDate", { required: true })}
          error={errors.checkOutDate}
        />
      </div>

      {nights > 0 && (
        <div className="mb-4 w-full rounded bg-blue-50 p-2">
          <p className="text-sm text-gray-700">
            <strong>Nights:</strong> {nights} | <strong>Rate per night:</strong>{" "}
            {formatPropertyMoney(watchRate, currency)} | <strong>Total:</strong>{" "}
            {formatPropertyMoney(calculatedTotal, currency)}
          </p>
        </div>
      )}

      <div
        className="mb-2 flex h-fit w-full flex-col gap-1 lg:mb-4 lg:flex-row lg:items-center lg:justify-between
        [&_div]:mb-2 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start lg:[&_div]:mb-0"
      >
        <InputComponent
          id="numberOfGuests"
          label="Number of Guests *"
          type="number"
          inputWidth="w-1/2"
          register={register("numberOfGuests", { valueAsNumber: true, required: true })}
          error={errors.numberOfGuests}
        />

        <InputComponent
          id="rate"
          label={`Rate per Night (${currency}) *`}
          type="number"
          inputWidth="w-1/2"
          register={register("rate", { valueAsNumber: true, required: true })}
          error={errors.rate}
        />
      </div>

      <div
        className="mb-2 flex h-fit w-full flex-col gap-1 lg:mb-4 lg:flex-row lg:items-center lg:justify-between
        [&_div]:mb-2 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start lg:[&_div]:mb-0"
      >
        <InputComponent
          id="totalAmount"
          label={`Total Amount (${currency}) *`}
          type="number"
          inputWidth="w-1/2"
          register={register("totalAmount", { valueAsNumber: true, required: true })}
          error={errors.totalAmount}
        />

        <InputComponent
          id="depositAmount"
          label={`Deposit Amount (${currency})`}
          type="number"
          inputWidth="w-1/2"
          register={register("depositAmount", { valueAsNumber: true })}
          error={errors.depositAmount}
        />
      </div>

      <div
        className="mb-2 flex h-fit w-full flex-col gap-1 lg:mb-4 lg:flex-row lg:items-center lg:justify-between
        [&_div]:mb-2 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start lg:[&_div]:mb-0"
      >
        <div className="flex-1">
          <label htmlFor="status" className="mb-1 block text-sm font-medium">
            Booking status *
          </label>
          <select
            id="status"
            {...register("status", { required: true })}
            className="w-full rounded border p-2"
            defaultValue="pending"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">
            Check-in and check-out happen after the booking is saved.
          </span>
          {errors.status && (
            <span className="text-sm text-red-500">{errors.status.message}</span>
          )}
        </div>
        <div className="flex-1">
          <label htmlFor="source" className="mb-1 block text-sm font-medium">
            Booking Source
          </label>
          <select
            id="source"
            {...register("source")}
            className="w-full rounded border p-2"
            defaultValue="direct"
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.source && (
            <span className="text-sm text-red-500">{errors.source.message}</span>
          )}
        </div>
      </div>

      <div
        className="mb-2 flex h-fit w-full flex-col gap-1 lg:mb-4 lg:flex-row lg:items-center lg:justify-start
        [&_div]:mb-2 [&_div]:flex [&_div]:flex-col [&_div]:items-start [&_div]:justify-start lg:[&_div]:mb-0"
      >
        <div className="w-full">
          <label htmlFor="specialRequests" className="mb-1 block text-sm font-medium">
            Special Requests
          </label>
          <textarea
            id="specialRequests"
            {...register("specialRequests")}
            rows={3}
            className="w-full rounded border p-2"
            placeholder="Enter special requests or notes (optional)"
          />
          {errors.specialRequests && (
            <span className="text-sm text-red-500">{errors.specialRequests.message}</span>
          )}
        </div>
      </div>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="dark">
          Submit
        </Button>
      </Modal.Footer>
    </form>
  );
}
