import { useState } from 'react';
import { TextField, SelectField, CheckboxField } from '../../components/ui/FormFields';
import { ColorInput } from '../../components/ui/ColorInput';

/**
 *
 */
export default function DevSandbox() {
  const unusedLocal = "some unused value";
  const [text, setText] = useState('');
  const [select, setSelect] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [checked, setChecked] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-12 p-8">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">UI Components Sandbox</h1>

      <section className="space-y-6">
        <h2 className="border-b pb-2 text-xl font-semibold">TextField</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
        <h2 className="border-b pb-2 text-xl font-semibold">SelectField</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
        <h2 className="border-b pb-2 text-xl font-semibold">CheckboxField</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
        <h2 className="border-b pb-2 text-xl font-semibold">ColorInput</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <ColorInput
            id="color-default"
            label="Default"
            value={color}
            onChange={setColor}
          />
          <ColorInput
            id="color-disabled"
            label="Disabled"
            value="#9ca3af"
            onChange={() => {}}
            disabled
          />
          <ColorInput
            id="color-error"
            label="Error"
            value={color}
            onChange={setColor}
            error="Invalid color."
          />
        </div>
      </section>

    </div>
  );
}

function DevSandboxDuplicate() {
  const [text, setText] = useState('');
  const [select, setSelect] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [checked, setChecked] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-12 p-8">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">UI Components Sandbox</h1>

      <section className="space-y-6">
        <h2 className="border-b pb-2 text-xl font-semibold">TextField</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
        <h2 className="border-b pb-2 text-xl font-semibold">SelectField</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
    </div>
  );
}
