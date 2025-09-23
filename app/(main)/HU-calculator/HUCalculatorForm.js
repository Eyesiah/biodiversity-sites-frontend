"use client"

import { useFormStatus } from 'react-dom';
import { calcHU } from './actions';
import { useActionState } from 'react';
import dynamic from 'next/dynamic';

const SearchableDropdown = dynamic(() => import('@/components/SearchableDropdown'), { ssr: false });

const initialState = {
  size: 0,
  habitat: '',
  condition: '',
  improvementType: 'none',
  result: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Calculating...' : 'Calculate'}
    </button>
  );
}
export default function HUCalculatorForm({ habitats, conditions }) {
  
  const [state, formAction] = useActionState(calcHU, initialState);

  return (
    <form action={formAction}>
        <table className="site-table">
          <tbody>
            <tr>
              <td>Size</td>
              <td><input name="size" defaultValue={state.size} /></td>
            </tr>
            <tr>
              <td>Habitat</td>
              <td><SearchableDropdown name="habitat" options={habitats} defaultValue={state.habitat} /></td>
            </tr>
            <tr>
              <td>Condition</td>
              <td><SearchableDropdown name="condition" options={conditions} defaultValue={state.condition} /></td>
            </tr>
            <tr>
              <td>Improvement Type</td>
              <td><select name="improvementType" defaultValue={state.improvementType} key={JSON.stringify(state.result)}>
                <option value="none">None</option>
                <option value="creation">Creation</option>
                <option value="enhanced">Improvement</option>
              </select></td>
            </tr>
            <tr>
              <td><SubmitButton /></td>
              <td>{state.result && <pre><code>{JSON.stringify(state.result, null, 2)}</code></pre>}</td>
            </tr>
          </tbody>
        </table>        
      </form>      
  )
}