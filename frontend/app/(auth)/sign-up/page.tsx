'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Eye, EyeOff, UserPlus, MapPin} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import LocationPicker from '@/features/order/components/LocationPicker';
import {useRouter} from 'next/navigation';
import {registerCustomer} from '@/lib/api/authApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setfirstname] = useState('');
  const [lastName, setlastname] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [houseAddress, setHouseAddress] = useState('');
  const [showAutoLocate, setShowAutoLocate] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleAddressInteract = () => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setShowAutoLocate(true);
      },
      error => {
        setShowAutoLocate(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            'Location access was denied. Click the address field to try again.'
          );
        } else {
          setLocationError(
            'Unable to retrieve your location. Please try again.'
          );
        }
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!houseAddress) {
      setErrorMessage('Please allow location access to fill your address.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please try again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await registerCustomer({
        firstName,
        lastName,
        email,
        password,
        phoneNumber,
        address: houseAddress
      });
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setErrorMessage(
        getFriendlyErrorMessage(
          error,
          'Unable to create your account. Please try again.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Create an account
        </h2>
        <p className="text-muted-foreground">
          Join DonClaudio&apos;s and start ordering
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            type="text"
            placeholder="Juan"
            value={firstName}
            onChange={e => setfirstname(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Dela Cruz"
            value={lastName}
            onChange={e => setlastname(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="09xxxxxxxxx"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="houseAddress">
            Address (House){' '}
            <span className="text-xs font-normal text-muted-foreground">
              — Location access required
            </span>
          </Label>

          <div
            className="flex items-center gap-2 cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring"
            onClick={!isSubmitting ? handleAddressInteract : undefined}
          >
            <MapPin size={16} className="shrink-0 text-muted-foreground" />
            <span
              className={
                houseAddress ? 'text-foreground' : 'text-muted-foreground'
              }
            >
              {houseAddress || 'Click to use your current location'}
            </span>
          </div>

          {locationError && (
            <p className="text-xs text-destructive">{locationError}</p>
          )}

          {showAutoLocate && (
            <div className="pt-3">
              <LocationPicker
                onConfirm={location => {
                  setHouseAddress(location.address);
                  setShowAutoLocate(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            placeholder="••••••••"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-[#3c5e45]"
          size="lg"
          disabled={isSubmitting}
        >
          <UserPlus size={18} />
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </Button>

        {errorMessage && (
          <div className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="text-[#3c5e45] font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
