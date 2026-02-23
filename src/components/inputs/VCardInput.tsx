import React from 'react';
import { VCardData } from '../../types';
import { TextField } from './FormFields';

interface VCardInputProps {
  data: VCardData;
  onChange: (updates: Partial<VCardData>) => void;
}

export const VCardInput: React.FC<VCardInputProps> = ({ data, onChange }) => {
  return (
    <fieldset className="space-y-3 min-w-0">
         <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-full mb-3">Contact Details (vCard)</legend>
         <div className="grid grid-cols-2 gap-3">
             <TextField
                id="vcard-firstname"
                name="firstName"
                label="First Name"
                autoComplete="given-name"
                maxLength={100}
                value={data.firstName}
                onChange={(e) => onChange({ firstName: e.target.value })}
                fieldSize="xs"
                showCharCount
             />
             <TextField
                id="vcard-lastname"
                name="lastName"
                label="Last Name"
                autoComplete="family-name"
                maxLength={100}
                value={data.lastName}
                onChange={(e) => onChange({ lastName: e.target.value })}
                fieldSize="xs"
                showCharCount
             />
         </div>

         <div className="grid grid-cols-2 gap-3">
            <TextField
                id="vcard-phone"
                name="phone"
                label="Mobile Phone"
                autoComplete="tel"
                type="tel"
                maxLength={20}
                value={data.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
                fieldSize="xs"
                showCharCount
            />
            <TextField
                id="vcard-email"
                name="email"
                label="Email"
                autoComplete="email"
                type="email"
                maxLength={254}
                value={data.email}
                onChange={(e) => onChange({ email: e.target.value })}
                fieldSize="xs"
                showCharCount
            />
         </div>

         <TextField
            id="vcard-org"
            name="organization"
            label="Company / Organization"
            autoComplete="organization"
            maxLength={100}
            value={data.organization}
            onChange={(e) => onChange({ organization: e.target.value })}
            fieldSize="xs"
            showCharCount
         />

         <TextField
            id="vcard-title"
            name="title"
            label="Job Title"
            autoComplete="organization-title"
            maxLength={100}
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            fieldSize="xs"
            showCharCount
         />

         <TextField
            id="vcard-website"
            name="website"
            label="Website"
            autoComplete="url"
            type="url"
            maxLength={2048}
            value={data.website}
            onChange={(e) => onChange({ website: e.target.value })}
            fieldSize="xs"
            showCharCount
         />

         <fieldset className="pt-2 border-t border-slate-100 dark:border-slate-800 min-w-0">
            <legend className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 w-full">Address</legend>
            <div className="space-y-3">
                <TextField
                   id="vcard-street"
                   name="street"
                   label="Street"
                   autoComplete="street-address"
                   maxLength={100}
                   placeholder="Street"
                   value={data.street}
                   onChange={(e) => onChange({ street: e.target.value })}
                   fieldSize="xs"
                   showCharCount
                />
                <div className="grid grid-cols-2 gap-3">
                    <TextField
                       id="vcard-city"
                       name="city"
                       label="City"
                       autoComplete="address-level2"
                       maxLength={100}
                       placeholder="City"
                       value={data.city}
                       onChange={(e) => onChange({ city: e.target.value })}
                       fieldSize="xs"
                       showCharCount
                    />
                    <TextField
                       id="vcard-country"
                       name="country"
                       label="Country"
                       autoComplete="country-name"
                       maxLength={100}
                       placeholder="Country"
                       value={data.country}
                       onChange={(e) => onChange({ country: e.target.value })}
                       fieldSize="xs"
                       showCharCount
                    />
                </div>
            </div>
         </fieldset>
    </fieldset>
  );
};
