import { useEffect, useState } from "react";
import {
  getTemplates,
  assignEmployeeSalary,
  listEmployeeSalaryStructures
} from "./SalaryApi";
import axios from "axios";

export default function EmployeeSalaryStructure() {

  const [employees,setEmployees] = useState([]);
  const [templates,setTemplates] = useState([]);
  const [structures,setStructures] = useState([]);

  const [employeeId,setEmployeeId] = useState("");
  const [templateId,setTemplateId] = useState("");
  const [ctc,setCtc] = useState("");
  const [effectiveFrom,setEffectiveFrom] = useState("");
  const [loading,setLoading] = useState(false)

  useEffect(()=>{
    loadEmployees()
    loadTemplates()
    loadStructures()
  },[])

  async function loadEmployees(){

    const token = localStorage.getItem("token")

    const res = await axios.get(
      "http://127.0.0.1:9000/api/employees/",
      {
        headers:{
          Authorization:`Bearer ${token}`
        }
      }
    )

    setEmployees(res.data)
  }

  async function loadTemplates(){

    const data = await getTemplates()
    setTemplates(data)

  }

  async function loadStructures(){

    const data = await listEmployeeSalaryStructures()
    setStructures(data)

  }

  async function handleAssign(){

    await assignEmployeeSalary({

      employee_id:employeeId,
      template_id:templateId,
      ctc:ctc,
      effective_from:effectiveFrom

    })

    alert("Salary assigned successfully")

    loadStructures() // reload table

    setEmployeeId("")
    setTemplateId("")
    setCtc("")
    setEffectiveFrom("")
  }

  return (

    <div className="p-6">

      <h1 className="text-xl font-semibold mb-6">
        Assign Salary Structure
      </h1>

      {/* FORM */}

      <div className="grid grid-cols-2 gap-4">

        {/* Employee */}

        <select
        className="border p-2 rounded"
        value={employeeId}
        onChange={(e)=>setEmployeeId(e.target.value)}
        >

          <option value="">Select Employee</option>

          {employees.map(emp=>(
            <option
            key={emp.employee_id}
            value={emp.employee_id}
            >
              {emp.first_name} {emp.last_name}
            </option>
          ))}

        </select>


        {/* Template */}

        <select
        className="border p-2 rounded"
        value={templateId}
        onChange={(e)=>setTemplateId(e.target.value)}
        >

          <option value="">Select Template</option>

          {templates.map(t=>(
            <option
            key={t.template_id}
            value={t.template_id}
            >
              {t.name}
            </option>
          ))}

        </select>


        {/* CTC */}

        <input
        className="border p-2 rounded"
        placeholder="CTC"
        value={ctc}
        onChange={(e)=>setCtc(e.target.value)}
        />


        {/* Effective Date */}

        <input
        type="date"
        className="border p-2 rounded"
        value={effectiveFrom}
        onChange={(e)=>setEffectiveFrom(e.target.value)}
        />

      </div>


      <button
onClick={handleAssign}
disabled={!employeeId || !templateId || !ctc || !effectiveFrom}
className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded disabled:bg-gray-400"
>
Assign Salary
</button>


      {/* TABLE */}

      <h2 className="text-lg font-semibold mt-10 mb-4">
        Employee Salary Structures
      </h2>

      <table className="w-full border">

        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Employee</th>
            <th className="border p-2">Template</th>
            <th className="border p-2">CTC</th>
            <th className="border p-2">Effective From</th>
          </tr>
        </thead>

        <tbody>

          {structures.map(s=>{

            const emp = employees.find(
              e=>e.employee_id === s.employee_id
            )

            const tpl = templates.find(
              t=>t.template_id === s.template_id
            )

            return(
              <tr key={s.id}>

                <td className="border p-2">
                  {emp?.first_name} {emp?.last_name}
                </td>

                <td className="border p-2">
                  {tpl?.name}
                </td>

                <td className="border p-2">
                  {s.ctc}
                </td>

                <td className="border p-2">
                  {s.effective_from}
                </td>

              </tr>
            )

          })}

        </tbody>

      </table>

    </div>

  )
}