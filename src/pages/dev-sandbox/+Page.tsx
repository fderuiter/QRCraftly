import React, { useState } from 'react';
import { TextField, SelectField, CheckboxField } from '../../components/ui/FormFields';
import { ColorInput } from '../../components/ui/ColorInput';

export default function DevSandbox() {
  const [text, setText] = useState('');
  const [select, setSelect] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [checked, setChecked] = useState(false);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">UI Components Sandbox</h1>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">TextField</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TextField
            label="Default"
            placeholder="Enter text..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <TextField
            label="Disabled"
            placeholder="Enter text..."
            value="Disabled value"
            disabled
          />
          <TextField
            label="Error"
            placeholder="Enter text..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            error="This field is required."
          />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">SelectField</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SelectField
            label="Default"
            value={select}
            onChange={(e) => setSelect(e.target.value)}
          >
            <option value="">Select an option</option>
            <option value="1">Option 1</option>
            <option value="2">Option 2</option>
          </SelectField>
          <SelectField
            label="Disabled"
            disabled
          >
            <option>Disabled option</option>
          </SelectField>
          <SelectField
            label="Error"
            value={select}
            onChange={(e) => setSelect(e.target.value)}
            error="Please select an option."
          >
            <option value="">Select an option</option>
            <option value="1">Option 1</option>
          </SelectField>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">CheckboxField</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CheckboxField
            label="Default"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <CheckboxField
            label="Disabled"
            disabled
            checked={true}
          />
          <CheckboxField
            label="Error"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            error="You must accept the terms."
          />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">ColorInput</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ColorInput
            id="color-default"
            label="Default"
            value={color}
            onChange={setColor}
          />
          <div className="opacity-50 pointer-events-none">
            <ColorInput
              id="color-disabled"
              label="Disabled (Simulated)"
              value="#9ca3af"
              onChange={() => {}}
            />
          </div>
          {/* Note: ColorInput doesn't have built-in error state, wrapping it to simulate if needed, or omit if unsupported */}
          <div className="border border-rose-500 rounded p-2">
            <ColorInput
              id="color-error"
              label="Error (Simulated)"
              value={color}
              onChange={setColor}
            />
            <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">Invalid color.</p>
          </div>
        </div>
      </section>

    </div>
  );
}
