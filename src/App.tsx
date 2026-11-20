import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PublicLayout } from "./components/layout";
import { Skeleton } from "./components/ui";
import BikeDetail from "./pages/BikeDetail";
import Bikes from "./pages/Bikes";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import Home from "./pages/Home";
import MyBooking from "./pages/MyBooking";
import NotFound from "./pages/NotFound";
import Pay from "./pages/Pay";
import { HowItWorks, Terms } from "./pages/simple";

// The admin area is loaded only when a hotel admin opens it
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const Login = lazy(() => import("./admin/Login"));
const Dashboard = lazy(() => import("./admin/Dashboard"));
const BikesAdmin = lazy(() => import("./admin/BikesAdmin"));
const BikeForm = lazy(() => import("./admin/BikeForm"));
const CategoriesAdmin = lazy(() => import("./admin/CategoriesAdmin"));
const PromotionsAdmin = lazy(() => import("./admin/PromotionsAdmin"));
const BookingsAdmin = lazy(() => import("./admin/BookingsAdmin"));
const CalendarAdmin = lazy(() => import("./admin/CalendarAdmin"));
const SettingsAdmin = lazy(() => import("./admin/SettingsAdmin"));
const DemoGuide = lazy(() => import("./admin/DemoGuide"));

const loading = <div className="p-8"><Skeleton className="h-96 rounded-2xl" /></div>;

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={loading}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="bikes" element={<Bikes />} />
            <Route path="bikes/:slug" element={<BikeDetail />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="pay/:reference" element={<Pay />} />
            <Route path="booking/:reference" element={<Confirmation />} />
            <Route path="my-booking" element={<MyBooking />} />
            <Route path="how-it-works" element={<HowItWorks />} />
            <Route path="terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="admin/login" element={<Login />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="bikes" element={<BikesAdmin />} />
            <Route path="bikes/new" element={<BikeForm />} />
            <Route path="bikes/:id" element={<BikeForm />} />
            <Route path="categories" element={<CategoriesAdmin />} />
            <Route path="promotions" element={<PromotionsAdmin />} />
            <Route path="bookings" element={<BookingsAdmin />} />
            <Route path="calendar" element={<CalendarAdmin />} />
            <Route path="settings" element={<SettingsAdmin />} />
            <Route path="demo-guide" element={<DemoGuide />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
