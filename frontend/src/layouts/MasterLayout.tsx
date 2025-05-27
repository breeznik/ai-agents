import { Outlet } from "react-router-dom";

const MasterLayout = () => {
  return (
    <div className="bg-cs-dark-primary h-screen w-screen">
      <Outlet />
    </div>
  );
};

export default MasterLayout;
