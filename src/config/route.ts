import { createBrowserRouter } from "react-router-dom";
import MasterLayout from "../layouts/MasterLayout";
import Homepage from "../pages/Homepage";

export const router = createBrowserRouter([
    {
        path: "/",
        Component: MasterLayout,
        children: [
            {
                index: true,
                Component: Homepage
            }
        ]
    },
]);