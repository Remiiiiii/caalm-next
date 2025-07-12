import React from 'react';
import UserManagement from '../UserManagement';

const UserManagementPage = () => {
  return (
    <div className="relative">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-[-10] opacity-60 pointer-events-none"
      >
        <source src="/assets/video/wave.mp4" type="video/mp4" />
      </video>
      {/* User Management Content */}
      <div className="relative z-10">
        <UserManagement />
      </div>
    </div>
  );
};

export default UserManagementPage;
