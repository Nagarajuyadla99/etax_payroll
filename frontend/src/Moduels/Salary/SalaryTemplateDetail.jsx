import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { addTemplateComponent, getComponents } from "./SalaryApi";

export default function SalaryTemplateDetail() {

  const { id } = useParams();

  const [components,setComponents] = useState([]);
  const [componentId,setComponentId] = useState("");
  const [amount,setAmount] = useState("");
  const [templateComponents,setTemplateComponents] = useState([]);

  useEffect(()=>{
    loadComponents()
  },[])

  async function loadComponents(){
    const data = await getComponents()
    setComponents(data)
  }

async function handleAdd() {

  if (!componentId) {
    alert("Select component");
    return;
  }

  const payload = {
    template_id: id,
    component_id: componentId,
    amount: amount ? Number(amount) : 0,
    sequence: 1
  };

  await addTemplateComponent(payload);

  alert("Component added");
}

  return (

    <div className="p-6">

      <h1 className="text-xl font-semibold mb-4">
        Template Builder
      </h1>

      <div className="flex gap-2 mb-6">

        <select
        className="border p-2 rounded"
        value={componentId}
        onChange={(e)=>setComponentId(e.target.value)}
        >

          <option value="">Select Component</option>

          {components.map(c=>(
            <option
            key={c.component_id}
            value={c.component_id}
            >
              {c.name}
            </option>
          ))}

        </select>

        <input
        className="border p-2 rounded"
        placeholder="Amount"
        value={amount}
        onChange={(e)=>setAmount(e.target.value)}
        />

        <button
        onClick={handleAdd}
        className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Add
        </button>

      </div>


      <table className="w-full border">

        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Component</th>
            <th className="border p-2">Amount</th>
          </tr>
        </thead>

        <tbody>

          {templateComponents.map(c=>{

            const comp = components.find(
              x=>x.component_id === c.component_id
            )

            return(
              <tr key={c.stc_id}>
                <td className="border p-2">{comp?.name}</td>
                <td className="border p-2">{c.amount}</td>
              </tr>
            )

          })}

        </tbody>

      </table>

    </div>

  )
}