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
    const [measurement, setMeasurement] = useState({ width: 0, height: 0 });

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
                const token = localStorage.getItem('token');

                try {
                    const response = await axios.post(`${cvApiUrl}/measure/`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    const { corners, width, height, message: responseMessage } = response.data;
                    setMessage(responseMessage);
                    setDetectedCorners(corners);
                    setMeasurement({ width, height });
                } catch (error) {
                    setMessage(`Failed to get measurement: ${error.response?.data?.detail || 'Server error'}`);
                }
            }, 'image/png');
        }
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
                    <video ref={videoRef} autoPlay playsInline style={{width: '100%', borderRadius: '8px'}}></video>
                    <canvas ref={canvasRef} style={{display: 'none'}}></canvas>
                    <button onClick={handleCapture} style={{width: '100%', marginTop: '1rem'}}>
                        Capture Frame
                    </button>
                    {measurement.width > 0 && (
                        <div style={{marginTop: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px'}}>
                            <h4>Measurement Result</h4>
                            <p>Detected object dimensions: <strong>{measurement.width} x {measurement.height} pixels</strong>.</p>
                            <p style={{fontSize: '0.9rem', color: '#666'}}>Note: This is a prototype. To get real-world units (e.g., cm, inches), a reference object of a known size would be needed in the frame.</p>
                            <div style={{marginTop: '1rem'}}>
                                <select disabled style={{width: 'calc(50% - 0.5rem)', marginRight: '1rem'}}><option>Assign to Project (Future)</option></select>
                                <button disabled style={{width: 'calc(50% - 0.5rem)'}}>Save Measurement (Future)</button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
