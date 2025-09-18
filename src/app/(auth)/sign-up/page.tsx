import AuthForm from '@/components/AuthForm';
import { Suspense } from 'react';

const SignUp = () => {
  return (
    <div>
      <Suspense fallback={null}>
        <AuthForm type="sign-up" />
      </Suspense>
    </div>
  );
};

export default SignUp;
