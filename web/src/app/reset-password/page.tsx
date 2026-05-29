import AuthForm from '@/components/AuthForm';

/**
 * Reset password page.
 * Expects a ?token= query parameter from the email link.
 */
export default function ResetPasswordPage() {
  return <AuthForm mode="reset-password" />;
}
