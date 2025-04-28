import React, { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import FitBounds from "./components/FitBounds"
import { toast, ToastContainer } from 'react-toastify';
import SvgOverlay from "./components/SvgOverlay";
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  const [plotFiles, setPlotFiles] = useState([]);
  const [sampleFile, setSampleFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [overlayUrl, setOverlayUrl] = useState(null);
  const [bounds, setBounds] = useState([
    [51.49, -0.12],
    [51.51, -0.06],
  ]);
  const [geojsonData, setGeojsonData] = useState(null);

  useEffect(() => {
    if (overlayUrl && bounds[0][0] !== null && bounds[1][0] !== null) {
      setBounds(bounds);
    }
  }, [overlayUrl, bounds]);

  const handleUpload = async () => {

    if (!plotFiles || !sampleFile) {
      toast.error("Please upload both a plot file and a sample file.");
      return;
    }
    setIsUploading(true);
    setProgress(0);

    const formData = new FormData();
    plotFiles.forEach((file) => {
      formData.append("plotFiles", file);
    });
    formData.append("sampleFile", sampleFile);

    try {
      const response = await axios.post(`${import.meta.env.VITE_APP_API_URL}upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (event) => {
          const percent = event.total ? Math.round((event.loaded * 100) / event.total) : 0;
          setProgress(percent);
        },
      });
      
      if (response.data && response.data.overlayUrl) {
        setOverlayUrl(response.data.overlayUrl);
        setAnalysisDone(true);

        if (response.data.bounds) {
          setBounds(response.data.bounds);
        }

        if (response.data.geojson) {
          setGeojsonData(response.data.geojson);
        }

        if (response.data.warnings && response.data.warnings.length > 0) {
          response.data.warnings.forEach(warning => {
            toast.warning(warning);
          });
        }
      }

    } catch (error) {
      toast.error(error.response.data.error || error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (acceptedFiles) => {
    const shpAndDbf = [];
    acceptedFiles.forEach((file) => {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith(".shp") || lowerName.endsWith(".dbf")) {
        shpAndDbf.push(file);
      } else if (lowerName.endsWith(".geojson")) {
        setPlotFiles([file]);
      } else if (lowerName.endsWith(".csv") || lowerName.endsWith(".xlsx")) {
        setSampleFile(file);
      }
    });

    if (shpAndDbf.length) {
      setPlotFiles(shpAndDbf);
    }
  };

  const handleDownload = async () => {
    if (!overlayUrl) return;

    try {
      const response = await axios.get(overlayUrl, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "interpolation.svg");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      '': ['.geojson', '.shp', '.dbf', '.shx', '.cpg', '.prj', '.csv', '.xlsx']
    }
  });
  console.log("overlayUrl", overlayUrl)
  return (
    <>
      <ToastContainer />
      <div className="container py-5">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img src="logo.png" alt="logo" width={"10%"} />
          <h1 style={{ marginBottom: "0px" }}>Nutrient Dose Interpolation Tool</h1>
        </div>

        <div
          {...getRootProps()}
          className={`dropzone border border-secondary rounded p-4 mb-4 text-center ${isDragActive ? "dropzone-active" : "dropzone-inactive"
            }`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-primary fw-bold">Drop the files here...</p>
          ) : (
            <p className="text-muted">Drag & drop plot and sample files here, or click to select</p>
          )}
          <small className="text-muted d-block mt-2">Accepted formats: .geojson, .shp + .dbf, .csv, .xlsx</small>
        </div>

        <div className="text-center mb-3">
          {plotFiles.map((file, i) => (
            <p key={i} className="mb-1">
              🗺️ Plot File: <span className="text-success">{file.name}</span>
            </p>
          ))}

          {sampleFile && <p className="mb-1">🧪 Sample File: <span className="text-success">{sampleFile.name}</span></p>}
        </div>

        <div className="text-center">
          <button
            onClick={handleUpload}
            className="btn btn-primary"
          >
            Upload & Analyze
          </button>

        </div>

        {isUploading && (
          <div className="mt-4">
            <p className="mb-1 small">Progress: {progress}%</p>
            <div className="progress">
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {analysisDone && (
          <div className="mt-4 text-center">
            <p className="text-success fw-bold">✅ Interpolation Completed</p>
            <button
              onClick={handleDownload}
              className="btn btn-dark mt-2"
            >
              Download PNG
            </button>

          </div>
        )}

        <div className="mt-5" style={{ height: "400px" }}>
          <MapContainer bounds={bounds} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {overlayUrl && overlayUrl.endsWith(".svg") && (
              <SvgOverlay svgUrl={overlayUrl} bounds={bounds} opacity={1} />
            )}

            {overlayUrl && <FitBounds bounds={bounds} />}
            {geojsonData && (
              <GeoJSON
                data={geojsonData}
                style={() => ({
                  color: "#ff7800",
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 0
                })}
                onEachFeature={(feature, layer) => {
                  layer.bindPopup(feature.properties.name || feature.properties.Name || "Polygon");
                }}
              />
            )}
          </MapContainer>
        </div>
      </div>
    </>
  );
}
