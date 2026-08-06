import { createBrowserRouter, Navigate, useRouteError } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Button, ErrorState } from '../components/ui';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, VerifyEmailPage } from '../routes/AuthPages';
import { AccountsPage, BudgetsPage, DashboardPage, NewAccountPage, NewTransactionPage, ReportsPage, SettingsPage, TransactionsPage } from '../routes/AppPages';

function RouteError() { const error=useRouteError(); console.error(error); return <main className="grid min-h-screen place-items-center bg-bg p-6"><div className="max-w-lg"><ErrorState onRetry={()=>location.reload()}/><Button variant="text" className="mt-3" onClick={()=>location.assign('/app/dashboard')}>Volver al Dashboard</Button></div></main>; }

export const router=createBrowserRouter([
  { path:'/', element:<Navigate to="/login" replace/> },
  { path:'/login', element:<LoginPage/> }, { path:'/register', element:<RegisterPage/> },
  { path:'/forgot-password', element:<ForgotPasswordPage/> }, { path:'/verify-email', element:<VerifyEmailPage/> }, { path:'/reset-password', element:<ResetPasswordPage/> },
  { path:'/app', element:<AppShell/>, errorElement:<RouteError/>, children:[
    { index:true, element:<Navigate to="dashboard" replace/> }, { path:'dashboard', element:<DashboardPage/> },
    { path:'transactions', element:<TransactionsPage/> }, { path:'transactions/new', element:<NewTransactionPage/> },
    { path:'accounts', element:<AccountsPage/> }, { path:'accounts/new', element:<NewAccountPage/> },
    { path:'budgets', element:<BudgetsPage/> }, { path:'reports', element:<ReportsPage/> }, { path:'settings', element:<SettingsPage/> },
  ]}, { path:'*', element:<Navigate to="/login" replace/> },
]);
