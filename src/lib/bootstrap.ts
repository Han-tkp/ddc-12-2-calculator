import { supabaseAdmin } from '@/lib/supabase';

/**
 * True only while the deployment has no user rows at all.
 *
 * Public self-registration must stay closed once anyone exists, because
 * `POST /api/register` creates `role: 'ADMIN'` and `src/lib/auth.ts` only lets
 * ADMIN log in — so an open endpoint would hand full control of the system to
 * anyone who can reach the URL. The single exception is the very first account
 * on a fresh deployment, which has no admin available to create it.
 */
export async function isBootstrapAllowed(): Promise<boolean> {
    const { count, error } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true });

    // Fail closed: if the check itself fails, do not treat it as "no users yet".
    if (error) {
        console.error('Bootstrap check failed:', error);
        return false;
    }

    return (count ?? 0) === 0;
}
