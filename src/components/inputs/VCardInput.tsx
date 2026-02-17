import React from 'react';
import { VCardData } from '../../types';
import { INPUT_CLASSES } from './styles';

interface VCardInputProps {
  data: VCardData;
  onChange: (updates: Partial<VCardData>) => void;
}

export const VCardInput: React.FC<VCardInputProps> = ({ data, onChange }) => {
  return (
    <fieldset className="space-y-3 min-w-0">
         <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-full mb-3">Contact Details (vCard)</legend>
         <div className="grid grid-cols-2 gap-3">
             <div>
                <label htmlFor="vcard-firstname" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">First Name</label>
                <input id="vcard-firstname" name="firstName" autoComplete="given-name" type="text" maxLength={100} value={data.firstName} onChange={(e) => onChange({ firstName: e.target.value })} className={INPUT_CLASSES} />
             </div>
             <div>
                <label htmlFor="vcard-lastname" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Last Name</label>
                <input id="vcard-lastname" name="lastName" autoComplete="family-name" type="text" maxLength={100} value={data.lastName} onChange={(e) => onChange({ lastName: e.target.value })} className={INPUT_CLASSES} />
             </div>
         </div>

         <div className="grid grid-cols-2 gap-3">
            <div>
                <label htmlFor="vcard-phone" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Mobile Phone</label>
                <input id="vcard-phone" name="phone" autoComplete="tel" type="tel" maxLength={20} value={data.phone} onChange={(e) => onChange({ phone: e.target.value })} className={INPUT_CLASSES} />
            </div>
            <div>
                <label htmlFor="vcard-email" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email</label>
                <input id="vcard-email" name="email" autoComplete="email" type="email" maxLength={254} value={data.email} onChange={(e) => onChange({ email: e.target.value })} className={INPUT_CLASSES} />
            </div>
         </div>

         <div>
            <label htmlFor="vcard-org" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Company / Organization</label>
            <input id="vcard-org" name="organization" autoComplete="organization" type="text" maxLength={100} value={data.organization} onChange={(e) => onChange({ organization: e.target.value })} className={INPUT_CLASSES} />
         </div>

         <div>
            <label htmlFor="vcard-title" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Job Title</label>
            <input id="vcard-title" name="title" autoComplete="organization-title" type="text" maxLength={100} value={data.title} onChange={(e) => onChange({ title: e.target.value })} className={INPUT_CLASSES} />
         </div>

         <div>
            <label htmlFor="vcard-website" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Website</label>
            <input id="vcard-website" name="website" autoComplete="url" type="url" maxLength={2048} value={data.website} onChange={(e) => onChange({ website: e.target.value })} className={INPUT_CLASSES} />
         </div>

         <fieldset className="pt-2 border-t border-slate-100 dark:border-slate-800 min-w-0">
            <legend className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 w-full">Address</legend>
            <div className="space-y-3">
                <div>
                   <label htmlFor="vcard-street" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Street</label>
                   <input id="vcard-street" name="street" autoComplete="street-address" type="text" maxLength={100} placeholder="Street" value={data.street} onChange={(e) => onChange({ street: e.target.value })} className={INPUT_CLASSES} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label htmlFor="vcard-city" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">City</label>
                       <input id="vcard-city" name="city" autoComplete="address-level2" type="text" maxLength={100} placeholder="City" value={data.city} onChange={(e) => onChange({ city: e.target.value })} className={INPUT_CLASSES} />
                    </div>
                    <div>
                       <label htmlFor="vcard-country" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Country</label>
                       <input id="vcard-country" name="country" autoComplete="country-name" type="text" maxLength={100} placeholder="Country" value={data.country} onChange={(e) => onChange({ country: e.target.value })} className={INPUT_CLASSES} />
                    </div>
                </div>
            </div>
         </fieldset>
    </fieldset>
  );
};
