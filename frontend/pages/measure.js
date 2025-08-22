import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
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

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Effect to get the camera stream once
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        async function getCamera() {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment' }
                    });
                    setStream(mediaStream);
                } catch (error) {
                    console.error("Error accessing camera:", error);
                    setMessage('Could not access camera. Please check permissions.');
                }
            } else {
                setMessage('Your browser does not support camera access.');
            }
        }

        getCamera();

        // Cleanup function to stop all tracks of the stream when the component unmounts
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [router]); // This effect should only run once on mount

    // Effect to attach the stream to the video element when the stream is ready
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            setMessage('Camera feed active.');
        }
    }, [stream]);

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
                    const { corners, message: responseMessage } = response.data;
                    setMessage(responseMessage);
                    setDetectedCorners(corners);
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
                </div>
            </main>
        </div>
    );
}
