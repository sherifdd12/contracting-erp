import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function MeasurePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [message, setMessage] = useState('Requesting camera access...');
    const [stream, setStream] = useState(null);
    const [detectedCorners, setDetectedCorners] = useState([]);
    const [isClient, setIsClient] = useState(false);
    const [measurement_mm, setMeasurement_mm] = useState({ width: 0, height: 0 });
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [description, setDescription] = useState('');
    const [referenceType, setReferenceType] = useState('A4_PAPER');
    const [displayUnit, setDisplayUnit] = useState('cm');

    useEffect(() => {
        setIsClient(true);
        let mediaStream = null;

        const getCamera = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/login');
                return;
            }

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment' }
                    });
                    setStream(mediaStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                        setMessage('Camera feed active.');
                    }
                } catch (error) {
                    console.error("Error accessing camera:", error);
                    setMessage('Could not access camera. Please check permissions.');
                }
            } else {
                setMessage('Your browser does not support camera access.');
            }
        };

        getCamera();

        // Cleanup function to stop all tracks of the stream when the component unmounts
        return () => {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
        };
        const fetchProjects = async (token) => {
            try {
                const projectsApiUrl = process.env.NEXT_PUBLIC_PROJECTS_API_URL || 'http://localhost:8002';
                const response = await axios.get(`${projectsApiUrl}/projects/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setProjects(response.data);
            } catch (error) {
                console.error("Failed to fetch projects", error);
            }
        };

        const token = localStorage.getItem('token');
        if (token) {
            fetchProjects(token);
        }
    }, []); // Empty dependency array ensures this runs only on mount and unmount

    const cvApiUrl = process.env.NEXT_PUBLIC_CV_API_URL || 'http://localhost:8009';

    useEffect(() => {
        if (detectedCorners && detectedCorners.length === 4 && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(detectedCorners[0].x, detectedCorners[0].y);
            ctx.lineTo(detectedCorners[1].x, detectedCorners[1].y);
            ctx.lineTo(detectedCorners[2].x, detectedCorners[2].y);
            ctx.lineTo(detectedCorners[3].x, detectedCorners[3].y);
            ctx.closePath();
            ctx.stroke();
        }
    }, [detectedCorners]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);

            setMessage('Frame captured! Sending for measurement...');
            setDetectedCorners([]); // Clear previous drawings

            canvasRef.current.toBlob(async (blob) => {
                if (!blob) {
                    setMessage('Failed to capture frame. Please try again.');
                    return;
                }
                const formData = new FormData();
                formData.append('file', blob, 'capture.png');
                formData.append('reference_type', referenceType);
                const token = localStorage.getItem('token');

                try {
                    const response = await axios.post(`${cvApiUrl}/measure/`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    const { corners, width_mm, height_mm, message: responseMessage } = response.data;
                    setMessage(responseMessage);
                    setDetectedCorners(corners);
                    setMeasurement_mm({ width: width_mm, height: height_mm });
                } catch (error) {
                    setMessage(`Failed to get measurement: ${error.response?.data?.detail || 'Server error'}`);
                }
            }, 'image/png');
        }
    };

    const handleSaveMeasurement = async () => {
        if (!selectedProject || !description || !measurement_mm.width) {
            setMessage('Please select a project, add a description, and perform a measurement first.');
            return;
        }

        canvasRef.current.toBlob(async (blob) => {
            if (!blob) {
                setMessage('Could not retrieve captured image. Please capture again.');
                return;
            }
            const formData = new FormData();
            formData.append('image', blob, 'measurement.png');
            formData.append('project_id', selectedProject);
            formData.append('description', description);
            formData.append('width_cm', (measurement_mm.width / 10).toFixed(2));
            formData.append('height_cm', (measurement_mm.height / 10).toFixed(2));

            const token = localStorage.getItem('token');
            const projectsApiUrl = process.env.NEXT_PUBLIC_PROJECTS_API_URL || 'http://localhost:8002';

            try {
                await axios.post(`${projectsApiUrl}/projects/${selectedProject}/measurements/`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                setMessage('Measurement saved successfully!');
            } catch (error) {
                setMessage(`Failed to save measurement: ${error.response?.data?.detail || 'Server error'}`);
            }
        }, 'image/png');
    };

    if (!isClient) {
        return null; // Render nothing on the server
    }

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                <h2 style={{ textAlign: 'center', marginTop: '5rem' }}>On-Site Measurement</h2>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.card} style={{width: '100%', maxWidth: '800px'}}>
                    <h3>Live Camera Feed</h3>
                    <div style={{border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '8px', background: '#f9f9f9'}}>
                        <strong>Instructions:</strong>
                        <ol style={{margin: '0.5rem 0 0 1.5rem', padding: 0}}>
                            <li>Select your reference object from the dropdown below.</li>
                            <li>Place the chosen reference object on the same flat surface as the object you want to measure.</li>
                            <li>Ensure both objects are fully visible, then click "Capture Frame".</li>
                        </ol>
                        <div style={{marginTop: '1rem'}}>
                            <label htmlFor="referenceType" style={{marginRight: '10px'}}>Reference Object:</label>
                            <select id="referenceType" value={referenceType} onChange={e => setReferenceType(e.target.value)}>
                                <option value="A4_PAPER">A4 Paper</option>
                                <option value="CREDIT_CARD">Credit Card</option>
                            </select>
                        </div>
                    </div>
                    <video ref={videoRef} autoPlay playsInline style={{width: '100%', borderRadius: '8px'}}></video>
                    <canvas ref={canvasRef} style={{display: 'none'}}></canvas>
                    <button onClick={handleCapture} style={{width: '100%', marginTop: '1rem'}}>
                        Capture Frame
                    </button>
                    {measurement_mm.width > 0 && (
                        <div style={{marginTop: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px'}}>
                            <h4>Measurement Result</h4>
                            <div>
                                <p style={{display: 'inline-block', marginRight: '20px'}}>
                                    Width: <strong>{displayUnit === 'cm' ? (measurement_mm.width / 10).toFixed(2) : (measurement_mm.width / 25.4).toFixed(2)} {displayUnit}</strong>
                                </p>
                                <p style={{display: 'inline-block'}}>
                                    Height: <strong>{displayUnit === 'cm' ? (measurement_mm.height / 10).toFixed(2) : (measurement_mm.height / 25.4).toFixed(2)} {displayUnit}</strong>
                                </p>
                            </div>
                            <div>
                                <button onClick={() => setDisplayUnit('cm')} style={{marginRight: '10px', fontWeight: displayUnit === 'cm' ? 'bold' : 'normal'}}>Show in cm</button>
                                <button onClick={() => setDisplayUnit('in')} style={{fontWeight: displayUnit === 'in' ? 'bold' : 'normal'}}>Show in inches</button>
                            </div>
                            <hr style={{margin: '1rem 0'}}/>
                            <div style={{marginTop: '1rem'}}>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add a description for this measurement..."
                                    style={{width: '100%', minHeight: '60px', marginBottom: '1rem'}}
                                />
                                <select
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value)}
                                    style={{width: 'calc(50% - 0.5rem)', marginRight: '1rem'}}
                                >
                                    <option value="">-- Select a Project --</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <button
                                    onClick={handleSaveMeasurement}
                                    style={{width: 'calc(50% - 0.5rem)'}}
                                >
                                    Save Measurement
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
