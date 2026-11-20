import { DeskOperatorProvider } from './components/deskOperator';

export default function RoomManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DeskOperatorProvider>{children}</DeskOperatorProvider>;
}
