import React, { useState } from "react";
import { Bell, Trash2, Plus } from "lucide-react";

export default function NoticeBoard({ isAdmin = true }) {

  const [showForm, setShowForm] = useState(false);

  const [newNotice, setNewNotice] = useState({
    text: "",
    priority: "Normal"
  });

  const [notices, setNotices] = useState([
    {
      id: 1,
      text: "Payroll processing scheduled for 30th.",
      priority: "Important",
      createdAt: new Date()
    },
    {
      id: 2,
      text: "Submit attendance before Friday.",
      priority: "Urgent",
      createdAt: new Date()
    },
    {
      id: 3,
      text: "Office closed on national holiday.",
      priority: "Normal",
      createdAt: new Date()
    }
  ]);


  // Add Notice
  const addNotice = () => {

    if (!newNotice.text) return;

    const notice = {
      id: Date.now(),
      text: newNotice.text,
      priority: newNotice.priority,
      createdAt: new Date()
    };

    setNotices([notice, ...notices]);

    setNewNotice({ text: "", priority: "Normal" });

    setShowForm(false);

  };


  // Delete Notice
  const deleteNotice = (id) => {
    setNotices(notices.filter(n => n.id !== id));
  };


  // Priority Style
  const getPriorityStyle = (priority) => {

    switch (priority) {

      case "Urgent":
        return "bg-red-100 text-red-700 animate-pulse";

      case "Important":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-slate-100 text-slate-600";

    }

  };


  // Format Date
  const formatDate = (date) => {

    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(date));

  };


  return (

    <div className="flex-1 p-6 bg-slate-50 min-h-screen">


      <div className="bg-white rounded-2xl shadow border">


        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">

          <div className="flex items-center gap-3">

            <div className="relative">

              <Bell className="text-indigo-600" />

              {/* Animated notification dot */}
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>

            </div>

            <div>

              <h2 className="font-semibold text-lg">
                Notice Board
              </h2>

              <p className="text-sm text-slate-500">
                Company announcements and alerts
              </p>

            </div>

          </div>


          {/* Admin Add Button */}
          {isAdmin && (

            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              <Plus size={16} />
              Add Notice
            </button>

          )}

        </div>



        {/* Add Notice Form */}
        {showForm && (

          <div className="p-4 border-b bg-slate-50">

            <div className="grid md:grid-cols-3 gap-3">

              <input
                placeholder="Enter notice text"
                value={newNotice.text}
                onChange={(e) =>
                  setNewNotice({
                    ...newNotice,
                    text: e.target.value
                  })
                }
                className="border px-3 py-2 rounded-lg col-span-2"
              />


              <select
                value={newNotice.priority}
                onChange={(e) =>
                  setNewNotice({
                    ...newNotice,
                    priority: e.target.value
                  })
                }
                className="border px-3 py-2 rounded-lg"
              >

                <option>Normal</option>
                <option>Important</option>
                <option>Urgent</option>

              </select>

            </div>


            <button
              onClick={addNotice}
              className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Create Notice
            </button>

          </div>

        )}



        {/* Notice List */}
        <div className="max-h-[500px] overflow-y-auto">

          {notices.length === 0 && (

            <p className="p-6 text-center text-slate-400">
              No notices available
            </p>

          )}


          {notices.map((notice) => (

            <div
              key={notice.id}
              className="flex justify-between items-start p-4 border-b hover:bg-slate-50"
            >

              <div className="flex gap-3">

                <div className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityStyle(notice.priority)}`}>
                  {notice.priority}
                </div>


                <div>

                  <p className="text-sm font-medium text-slate-700">
                    {notice.text}
                  </p>

                  <p className="text-xs text-slate-400">
                    {formatDate(notice.createdAt)}
                  </p>

                </div>

              </div>


              {/* Delete Button */}
              {isAdmin && (

                <button
                  onClick={() => deleteNotice(notice.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>

              )}

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}
