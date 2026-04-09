import { checkRole } from "./roles";

export default function CheckUserRole() {

  if (!checkRole('admin')) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p className="text-red-600">Access denied. Admin role required.</p>
      </div>
    );
  }
}