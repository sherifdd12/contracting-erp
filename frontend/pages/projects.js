import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { jwtDecode } from 'jwt-decode';
import styles from '../styles/Home.module.css';
import Navbar from '../components/Navbar';

export default function ProjectsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]); // For assignee dropdown
    const [selectedProject, setSelectedProject] = useState(null); // To show tasks for
    const [tasks, setTasks] = useState([]);
    const [message, setMessage] = useState('');
    const [userRole, setUserRole] = useState(null);

    // Form state for creating a new project
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState('');

    const projectsApiUrl = process.env.NEXT_PUBLIC_PROJECTS_API_URL || 'http://localhost:8002';

    const authApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
    const tasksApiUrl = process.env.NEXT_PUBLIC_TASKS_API_URL || 'http://localhost:8005';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const decodedToken = jwtDecode(token);
            setUserRole(decodedToken.role);
            fetchProjects(token);
            // Only fetch the full user list if the user is an admin
            if (decodedToken.role === 'admin') {
                fetchUsers(token);
            }
        } catch (error) {
            // Invalid token, redirect to login
            router.push('/login');
        }
    }, [router]);

    const fetchUsers = async (token) => {
        try {
            const response = await axios.get(`${authApiUrl}/users/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(response.data);
        } catch (error) {
            setMessage('Failed to fetch users.');
        }
    };

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
            router.push('/login');
            return;
        }
        try {
            await axios.post(
                `${projectsApiUrl}/projects/`,
                { name, description, budget: parseFloat(budget) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage('Project created successfully!');
            setName('');
            setDescription('');
            setBudget('');
            fetchProjects(token);
        } catch (error) {
            setMessage(`Failed to create project: ${error.response?.data?.detail || error.message}`);
        }
    };

    const fetchTasksForProject = async (projectId, token) => {
        try {
            const response = await axios.get(`${tasksApiUrl}/tasks/project/${projectId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTasks(response.data);
        } catch (error) {
            setTasks([]);
        }
    };

    const handleSelectProject = (project) => {
        setSelectedProject(project);
        const token = localStorage.getItem('token');
        fetchTasksForProject(project.id, token);
    };

    // --- Task Form State & Handler ---
    const [taskDescription, setTaskDescription] = useState('');
    const [taskAssignee, setTaskAssignee] = useState('');

    const handleCreateTask = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token || !selectedProject) {
            setMessage('Please select a project first.');
            return;
        }
        if (!taskAssignee) {
            setMessage('Please assign the task to a user.');
            return;
        }
        try {
            await axios.post(
                `${tasksApiUrl}/tasks/`,
                {
                    description: taskDescription,
                    project_id: selectedProject.id,
                    assigned_to_id: parseInt(taskAssignee),
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage('Task created successfully!');
            setTaskDescription('');
            setTaskAssignee('');
            fetchTasksForProject(selectedProject.id, token);
        } catch (error) {
            setMessage(`Failed to create task: ${error.response?.data?.detail || error.message}`);
        }
    };

    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.main}>
                <h2 style={{textAlign: 'center', marginTop: '5rem'}}>{t('Project_Management')}</h2>
                {message && <p className={styles.message}>{message}</p>}

                <div className={styles.grid}>
                    {/* Column 1: Projects List & Create Project Form */}
                    <div className={styles.card} style={{width: '100%', maxWidth: '400px'}}>
                        <h3>{t('All_Projects')}</h3>
                        {projects.length > 0 ? (
                            <ul style={{listStyle: 'none', padding: 0}}>
                                {projects.map((project) => (
                                    <li key={project.id} onClick={() => handleSelectProject(project)} style={{cursor: 'pointer', fontWeight: selectedProject?.id === project.id ? 'bold' : 'normal', padding: '0.5rem', borderBottom: '1px solid #eee'}}>
                                        {project.name}
                                    </li>
                                ))}
                            </ul>
                        ) : <p>{t('No_projects_found')}</p>}

                        <hr style={{margin: '2rem 0'}}/>
                        <h3>{t('Create_New_Project')}</h3>
                        <form onSubmit={handleCreateProject}>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Project_Name')} required />
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('Description')}></textarea>
                            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder={t('Budget')} required />
                            <button type="submit">{t('Create_New_Project')}</button>
                        </form>
                    </div>

                    {/* Column 2: Tasks for Selected Project */}
                    <div className={styles.card} style={{width: '100%', maxWidth: '600px'}}>
                        <h3>{t('Tasks_for')}: {selectedProject ? selectedProject.name : '...'}</h3>
                        {selectedProject ? (
                            <>
                                {tasks.length > 0 ? (
                                    <ul style={{listStyle: 'none', padding: 0}}>{tasks.map(task => <li key={task.id} style={{padding: '0.5rem', borderBottom: '1px solid #eee'}}>{task.description} <span style={{color: '#888'}}>({task.status})</span></li>)}</ul>
                                ) : <p>{t('No_tasks_for_project')}</p>}
                                {userRole === 'admin' && (
                                    <>
                                        <hr style={{margin: '2rem 0'}}/>
                                        <h4>{t('Add_Task')}</h4>
                                        <form onSubmit={handleCreateTask}>
                                            <textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder={t('Task_description')} required></textarea>
                                            <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} required>
                                                <option value="">{t('Assign_to')}</option>
                                                {users.map(user => (
                                                    <option key={user.id} value={user.id}>{user.username}</option>
                                                ))}
                                            </select>
                                            <button type="submit">{t('Add_Task')}</button>
                                        </form>
                                    </>
                                )}
                            </>
                        ) : <p>{t('Select_project_to_view_tasks')}</p>}
                    </div>
                </div>
            </main>
        </div>
    );
}
