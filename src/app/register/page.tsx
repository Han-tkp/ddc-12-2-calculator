import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isBootstrapAllowed } from '@/lib/bootstrap';
import { RegisterForm } from './register-form';

export const dynamic = 'force-dynamic';

/**
 * Registration creates an ADMIN account (see /api/register), so this page is only
 * reachable while the deployment has no users yet, or by an admin who is already
 * signed in. Everyone else is sent to the login page.
 */
export default async function RegisterPage() {
    const session = await auth();
    const isAdmin = session?.user?.role === 'ADMIN';

    if (!isAdmin && !(await isBootstrapAllowed())) {
        redirect('/login');
    }

    return <RegisterForm />;
}
