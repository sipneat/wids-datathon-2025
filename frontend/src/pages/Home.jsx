import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl text-white font-bold mb-8">Welcome to the Home Page</h1>
      <button
        className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        onClick={() => navigate("/example")}
      >
        Go to Example Page
      </button>
    </div>
  );
}
