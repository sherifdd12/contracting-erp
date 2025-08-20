import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [message, setMessage] = useState('');

    // Form state for creating a new project
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState('');

    const projectsApiUrl = process.env.NEXT_PUBLIC_PROJECTS_API_URL || 'http://localhost:8002';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/'); // Redirect to login page if no token
        } else {
            fetchProjects(token);
        }
    }, [router]);

    const fetchProjects = async (token) => {
        try {
            const response = await axios.get(`${projectsApiUrl}/projects/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProjects(response.data);
        } catch (error) {
            setMessage('Failed to fetch projects.');
            // Handle token expiration, e.g., redirect to login
            if (error.response && error.response.status === 401) {
                router.push('/');
            }
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }
        try {
            await axios.post(
                `${projectsApiUrl}/projects/`,
                { name, description, budget: parseFloat(budget) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage('Project created successfully!');
            // Clear form and refetch projects
            setName('');
            setDescription('');
            setBudget('');
            fetchProjects(token);
        } catch (error) {
            setMessage(`Failed to create project: ${error.response?.data?.detail || error.message}`);
        }
    };

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                <h2 style={{textAlign: 'center', marginTop: '5rem'}}>Project Management</h2>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.grid}>
                    {/* Create Project Form */}
                    <div className={styles.card}>
                        <h2>Create New Project</h2>
                        <form onSubmit={handleCreateProject}>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project Name" required />
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description"></textarea>
                            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget" required />
                            <button type="submit">Create Project</button>
                        </form>
                    </div>

                    {/* Projects List */}
                    <div className={styles.card} style={{width: '100%', maxWidth: '800px'}}>
                        <h2>Existing Projects</h2>
                        {projects.length > 0 ? (
                            <ul>
                                {projects.map((project) => (
                                    <li key={project.id}>
                                        <strong>{project.name}</strong> - Budget: ${project.budget}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No projects found. Create one!</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
