'use client';

import {useState, type FormEvent} from 'react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Card, CardContent} from '@/components/ui/card';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';
import {useUpdateProfileMutation} from '@/lib/hooks/auth/useProfile';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import type {MeUser} from '@/lib/api/authApi';
import {ImagePlus} from 'lucide-react';

type ProfileForm = {
  fullName: string;
  email: string;
  phoneNumber: string;
  username: string;
};

type BusinessForm = {
  businessName: string;
  storeAddress: string;
  businessContactNumber: string;
  operatingHours: string;
  businessType: string;
};

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text'
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function ProfileTab() {
  const meQuery = useMeQuery();
  const user = meQuery.data?.user;

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return <ProfileForm user={user} />;
}

function ProfileForm({user}: {user: MeUser}) {
  const [profile, setProfile] = useState<ProfileForm>({
    fullName:
      user.firstName || user.lastName
        ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
        : '',
    email: user.email ?? '',
    phoneNumber: user.phoneNumber ?? '',
    username: user.username ?? ''
  });
  const [business, setBusiness] = useState<BusinessForm>({
    businessName: user.businessName ?? '',
    storeAddress: user.storeAddress ?? '',
    businessContactNumber: user.businessContactNumber ?? '',
    operatingHours: user.operatingHours ?? '',
    businessType: user.businessType ?? ''
  });

  const updateProfileMutation = useUpdateProfileMutation();

  const onSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const [firstName = '', lastName = ''] = profile.fullName.split(' ');
    try {
      await updateProfileMutation.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: profile.email.trim() || undefined,
        phoneNumber: profile.phoneNumber.trim() || undefined,
        username: profile.username.trim() || undefined
      });
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(
        getFriendlyErrorMessage(err, 'Failed to save profile changes')
      );
    }
  };

  const onSaveBusiness = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync({
        businessName: business.businessName.trim() || undefined,
        storeAddress: business.storeAddress.trim() || undefined,
        businessContactNumber:
          business.businessContactNumber.trim() || undefined,
        operatingHours: business.operatingHours.trim() || undefined,
        businessType: business.businessType.trim() || undefined
      });
      toast.success('Business details updated.');
    } catch (err) {
      toast.error(
        getFriendlyErrorMessage(err, 'Failed to save business details')
      );
    }
  };

  const isBusy = updateProfileMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="border-gray-100 p-0">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-[#2d4a35] mb-4">
            Your Profile
          </h2>

          <form onSubmit={onSaveProfile} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#e9f5ee] text-[#2d4a35] flex items-center justify-center overflow-hidden shrink-0">
                {user?.businessLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.businessLogo}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold">
                    {(user?.firstName ?? 'D').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <Button type="button" variant="outline" size="sm">
                <ImagePlus className="h-4 w-4" />
                Upload photo
              </Button>
            </div>

            <Field
              id="profileFullName"
              label="Full name"
              value={profile.fullName}
              onChange={v => setProfile(p => ({...p, fullName: v}))}
              placeholder="e.g. Juan Dela Cruz"
            />
            <Field
              id="profileEmail"
              label="Email"
              type="email"
              value={profile.email}
              onChange={v => setProfile(p => ({...p, email: v}))}
              placeholder="e.g. owner@example.com"
            />
            <Field
              id="profilePhone"
              label="Phone number"
              value={profile.phoneNumber}
              onChange={v => setProfile(p => ({...p, phoneNumber: v}))}
              placeholder="e.g. 09171234567"
            />
            <Field
              id="profileUsername"
              label="Username"
              value={profile.username}
              onChange={v => setProfile(p => ({...p, username: v}))}
              placeholder="e.g. donclaudio_owner"
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isBusy}
                className="bg-[#2d4a35] hover:bg-[#24402c]"
              >
                {isBusy ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-gray-100 p-0">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-[#2d4a35] mb-4">
            Business Details
          </h2>

          <form onSubmit={onSaveBusiness} className="space-y-4">
            <Field
              id="businessName"
              label="Business/store name"
              value={business.businessName}
              onChange={v => setBusiness(b => ({...b, businessName: v}))}
              placeholder="e.g. Don Claudio's Lechon House"
            />
            <div className="space-y-1.5">
              <Label htmlFor="businessLogo">Business logo</Label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-[#e9f5ee] text-[#2d4a35] flex items-center justify-center overflow-hidden shrink-0">
                  {user.businessLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.businessLogo}
                      alt="Business logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold">
                      {(user.businessName ?? 'D').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <Button type="button" variant="outline" size="sm">
                  <ImagePlus className="h-4 w-4" />
                  Upload logo
                </Button>
              </div>
            </div>
            <Field
              id="storeAddress"
              label="Store address"
              value={business.storeAddress}
              onChange={v => setBusiness(b => ({...b, storeAddress: v}))}
              placeholder="e.g. 123 Lechon St., Brgy. San Isidro"
            />
            <Field
              id="businessContact"
              label="Business contact number"
              value={business.businessContactNumber}
              onChange={v =>
                setBusiness(b => ({...b, businessContactNumber: v}))
              }
              placeholder="e.g. (02) 1234 5678"
            />
            <Field
              id="operatingHours"
              label="Operating hours"
              value={business.operatingHours}
              onChange={v => setBusiness(b => ({...b, operatingHours: v}))}
              placeholder="e.g. Mon–Sun, 8AM–8PM"
            />
            <Field
              id="businessType"
              label="Business type"
              value={business.businessType}
              onChange={v => setBusiness(b => ({...b, businessType: v}))}
              placeholder="e.g. Food & Beverage"
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isBusy}
                className="bg-[#2d4a35] hover:bg-[#24402c]"
              >
                {isBusy ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
