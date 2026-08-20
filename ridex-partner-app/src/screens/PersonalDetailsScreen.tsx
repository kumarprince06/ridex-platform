import { useState } from 'react';

import { Button } from '../components/Button';
import { Screen, ScreenTitle } from '../components/Screen';
import { StepProgress } from '../components/StepProgress';
import { TextField } from '../components/TextField';
import { RootScreenProps } from '../navigation/types';

type Props = RootScreenProps<'PersonalDetails'>;

/** Produces DriverOnboardingStatus.PROFILE_SUBMITTED. */
export function PersonalDetailsScreen({ navigation, route }: Props) {
  const [fullName, setFullName] = useState(route.params.fullName);
  const [dob, setDob] = useState('');
  const [licence, setLicence] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Your details"
      footer={<Button label="Continue" onPress={() => navigation.navigate('VehicleDetails')} />}
    >
      <StepProgress current="Profile" />

      <ScreenTitle
        title="Tell us who you are"
        subtitle="This has to match your licence. Operations checks it against your documents."
      />

      <TextField label="Full Name" value={fullName} onChangeText={setFullName} icon="person-outline" autoCapitalize="words" />
      <TextField
        label="Date of Birth"
        value={dob}
        onChangeText={setDob}
        placeholder="DD / MM / YYYY"
        icon="calendar-outline"
        keyboardType="number-pad"
      />
      <TextField
        label="Licence Number"
        value={licence}
        onChangeText={setLicence}
        placeholder="DL-0420110149646"
        icon="card-outline"
        autoCapitalize="none"
      />
      <TextField label="Driving City" value={city} onChangeText={setCity} placeholder="New York" icon="location-outline" autoCapitalize="words" />
      <TextField label="Home Address" value={address} onChangeText={setAddress} placeholder="Street, area, ZIP" icon="home-outline" autoCapitalize="words" />
    </Screen>
  );
}
