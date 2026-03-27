import { useState } from "react";
import axios from "axios";
import { useActor } from "../../app/actor-context";
import { useNavigate } from "react-router-dom";

export default function LeaveCreate() {
  const { actor } = useActor();
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!actor) return;

    if (!fromDate || !toDate || !reason) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        "http://localhost:3000/api/leave/requests",
        {
          fromDate,
          toDate,
          reason,
        },
        {
          headers: {
            "x-user-id": actor.id,
            "x-user-role": actor.role,
          },
        }
      );

      alert("Gửi đơn thành công!");
      navigate("/leave");
    } catch (err) {
      alert("Gửi đơn thất bại!");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    marginTop: "5px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    outline: "none",
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "90vh",
        background: "#f5f6fa",
      }}
    >
      <div
        style={{
          width: "420px",
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          📝 Tạo đơn nghỉ phép
        </h2>

        {/* FROM DATE */}
        <div style={{ marginBottom: "15px" }}>
          <label>Từ ngày</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* TO DATE */}
        <div style={{ marginBottom: "15px" }}>
          <label>Đến ngày</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* REASON */}
        <div style={{ marginBottom: "20px" }}>
          <label>Lý do</label>
          <textarea
            placeholder="Nhập lý do nghỉ..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ ...inputStyle, height: "80px" }}
          />
        </div>

        {/* BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            background: loading ? "#ccc" : "#ff7a00",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {loading ? "Đang gửi..." : "Gửi đơn"}
        </button>
      </div>
    </div>
  );
}