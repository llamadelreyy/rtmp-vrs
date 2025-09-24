// frontend/src/pages/Reports.js

import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  LinearProgress
} from '@mui/material';
import {
  Download as DownloadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Assessment as ReportIcon,
  Security as SecurityIcon,
  Traffic as TrafficIcon,
  Business as ComplianceIcon,
  AutoAwesome as AIIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import useStreams from '../hooks/useStreams';

const Root = styled('div')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

const PresetCard = styled(Card)(({ theme }) => ({
  height: '100%',
  cursor: 'pointer',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.02)',
  },
  display: 'flex',
  flexDirection: 'column',
}));

const ReportCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const GeneratingCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  border: `2px solid ${theme.palette.primary.main}`,
}));

const ReportDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    minWidth: '600px',
    maxWidth: '800px',
  },
}));

const ViewerDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    maxWidth: '95vw',
    maxHeight: '95vh',
    width: '90vw',
    height: '90vh',
  },
}));

const Reports = () => {
  const { streams } = useStreams();
  const [selectedTab, setSelectedTab] = useState(0);
  const [reports, setReports] = useState([]);
  const [generatingReports, setGeneratingReports] = useState([]);
  const [reportDialog, setReportDialog] = useState({ open: false, preset: null });
  const [viewerDialog, setViewerDialog] = useState({ open: false, report: null });
  const [customPrompt, setCustomPrompt] = useState('');

  const reportPresets = [
    {
      id: 'daily_analysis',
      title: 'Daily Analysis',
      description: 'Comprehensive daily summary of all camera activities',
      icon: <ReportIcon />,
      color: 'primary',
      estimatedTime: '2-3 minutes',
      defaultPrompt: 'Generate a comprehensive daily analysis report including: activity summary, detected objects and people, unusual events, and security insights for all cameras.',
      parameters: {
        cameras: 'all',
        timeRange: '24h',
        includeCharts: true,
        includeImages: true
      }
    },
    {
      id: 'security_incidents',
      title: 'Security Incidents',
      description: 'Analysis of security-related events and threats',
      icon: <SecurityIcon />,
      color: 'error',
      estimatedTime: '3-5 minutes',
      defaultPrompt: 'Analyze security incidents including unauthorized access, suspicious behavior, alarm triggers, and potential threats. Provide risk assessment and recommendations.',
      parameters: {
        cameras: 'all',
        timeRange: '7d',
        focusOn: 'security',
        includeRiskAssessment: true
      }
    },
    {
      id: 'traffic_footfall',
      title: 'Traffic & Footfall',
      description: 'People and vehicle traffic analysis with patterns',
      icon: <TrafficIcon />,
      color: 'info',
      estimatedTime: '2-4 minutes',
      defaultPrompt: 'Analyze traffic patterns including people count, vehicle flow, peak hours, and movement trends. Include comparative data and insights.',
      parameters: {
        cameras: 'all',
        timeRange: '7d',
        focusOn: 'traffic',
        includePatterns: true
      }
    },
    {
      id: 'compliance',
      title: 'Compliance Report',
      description: 'Regulatory compliance and audit documentation',
      icon: <ComplianceIcon />,
      color: 'success',
      estimatedTime: '5-7 minutes',
      defaultPrompt: 'Generate compliance report documenting system performance, data retention, security measures, and regulatory adherence for audit purposes.',
      parameters: {
        cameras: 'all',
        timeRange: '30d',
        includeSystemMetrics: true,
        auditTrail: true
      }
    }
  ];

  const mockReports = [
    {
      id: '1',
      title: 'Daily Analysis - January 15, 2024',
      type: 'daily_analysis',
      status: 'completed',
      createdAt: '2024-01-15T18:00:00.000Z',
      completedAt: '2024-01-15T18:03:22.000Z',
      fileSize: '2.4 MB',
      format: 'PDF',
      cameras: ['Front Door', 'Parking Lot', 'Lobby'],
      timeRange: '24h',
      summary: 'Analyzed 1,247 events across 3 cameras. Peak activity between 8-10 AM and 5-7 PM.',
      downloadUrl: '/api/reports/daily_analysis_20240115.pdf'
    },
    {
      id: '2',
      title: 'Security Incidents - Week 2',
      type: 'security_incidents',
      status: 'completed',
      createdAt: '2024-01-14T16:30:00.000Z',
      completedAt: '2024-01-14T16:35:45.000Z',
      fileSize: '1.8 MB',
      format: 'DOCX',
      cameras: ['All cameras'],
      timeRange: '7d',
      summary: 'Identified 3 security incidents, 2 resolved. Risk level: Low.',
      downloadUrl: '/api/reports/security_incidents_week2.docx'
    }
  ];

  useEffect(() => {
    setReports(mockReports);
  }, [mockReports]);

  const handleGenerateReport = async (preset, customParameters = {}) => {
    const reportId = Date.now().toString();
    const newReport = {
      id: reportId,
      title: `${preset.title} - ${new Date().toLocaleDateString()}`,
      type: preset.id,
      status: 'generating',
      createdAt: new Date().toISOString(),
      progress: 0,
      ...preset.parameters,
      ...customParameters
    };

    setGeneratingReports([...generatingReports, newReport]);
    setReportDialog({ open: false, preset: null });

    // Simulate report generation with progress updates
    const progressInterval = setInterval(() => {
      setGeneratingReports(current => 
        current.map(report => 
          report.id === reportId 
            ? { ...report, progress: Math.min(report.progress + Math.random() * 20, 95) }
            : report
        )
      );
    }, 1000);

    // Simulate completion after random time
    setTimeout(() => {
      clearInterval(progressInterval);
      
      const completedReport = {
        ...newReport,
        status: 'completed',
        completedAt: new Date().toISOString(),
        progress: 100,
        fileSize: `${(Math.random() * 3 + 1).toFixed(1)} MB`,
        format: 'PDF',
        summary: `Generated report with ${Math.floor(Math.random() * 1000 + 500)} analyzed events.`,
        downloadUrl: `/api/reports/${preset.id}_${Date.now()}.pdf`
      };

      setGeneratingReports(current => current.filter(r => r.id !== reportId));
      setReports(current => [completedReport, ...current]);
    }, Math.random() * 10000 + 5000); // 5-15 seconds
  };

  const handleCustomReport = () => {
    const customPreset = {
      id: 'custom',
      title: 'Custom Analysis',
      description: 'Custom AI-generated report',
      defaultPrompt: customPrompt,
      parameters: {
        cameras: 'all',
        timeRange: '24h',
        includeCharts: true
      }
    };
    
    handleGenerateReport(customPreset);
    setCustomPrompt('');
  };

  const handleDownloadReport = (report) => {
    // Simulate download
    const link = document.createElement('a');
    link.href = report.downloadUrl;
    link.download = `${report.title}.${report.format.toLowerCase()}`;
    link.click();
  };

  const handleShareReport = (report) => {
    // Generate shareable link
    const shareUrl = `${window.location.origin}/reports/shared/${report.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  };

  const handleDeleteReport = (reportId) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      setReports(reports.filter(r => r.id !== reportId));
    }
  };

  const handleViewReport = (report) => {
    setViewerDialog({ open: true, report });
  };

  const renderReportForm = () => {
    const preset = reportDialog.preset;
    if (!preset) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="info" icon={<AIIcon />}>
              This report will be generated using AI analysis. Estimated time: {preset.estimatedTime}
            </Alert>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Report Title"
              defaultValue={`${preset.title} - ${new Date().toLocaleDateString()}`}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select defaultValue={preset.parameters.timeRange}>
                <MenuItem value="1h">Past Hour</MenuItem>
                <MenuItem value="24h">Past 24 Hours</MenuItem>
                <MenuItem value="7d">Past Week</MenuItem>
                <MenuItem value="30d">Past Month</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Cameras</InputLabel>
              <Select multiple defaultValue={preset.parameters.cameras === 'all' ? streams.map(s => s._id) : []}>
                {streams.map((stream) => (
                  <MenuItem key={stream._id} value={stream._id}>
                    {stream.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Custom Instructions (Optional)"
              placeholder="Add specific requirements or focus areas for this report..."
              defaultValue={preset.defaultPrompt}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Output Options</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Format</InputLabel>
                  <Select defaultValue="PDF">
                    <MenuItem value="PDF">PDF Document</MenuItem>
                    <MenuItem value="DOCX">Word Document</MenuItem>
                    <MenuItem value="HTML">Web Page</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Include</InputLabel>
                  <Select multiple defaultValue={['charts', 'images']}>
                    <MenuItem value="charts">Charts & Graphs</MenuItem>
                    <MenuItem value="images">Sample Images</MenuItem>
                    <MenuItem value="tables">Data Tables</MenuItem>
                    <MenuItem value="timeline">Timeline View</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderReportPreview = (report) => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {report.title}
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Box sx={{ 
            height: '600px', 
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 3,
            overflow: 'auto'
          }}>
            <Typography variant="h6" gutterBottom>Executive Summary</Typography>
            <Typography paragraph>
              {report.summary || 'This report provides comprehensive analysis of surveillance data for the specified time period.'}
            </Typography>
            
            <Typography variant="h6" gutterBottom>Key Findings</Typography>
            <Typography paragraph>
              • Total events analyzed: {Math.floor(Math.random() * 1000 + 500)}
            </Typography>
            <Typography paragraph>
              • Peak activity periods: 8:00-10:00 AM, 5:00-7:00 PM
            </Typography>
            <Typography paragraph>
              • Security incidents: {Math.floor(Math.random() * 5)}
            </Typography>
            
            <Typography variant="h6" gutterBottom>Recommendations</Typography>
            <Typography paragraph>
              Based on the analysis, we recommend enhanced monitoring during peak hours and review of access control procedures.
            </Typography>
            
            <Box sx={{ mt: 4, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                This is a preview. Download the full report for complete analysis, charts, and detailed findings.
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Report Details</Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Created:</strong> {new Date(report.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Time Range:</strong> {report.timeRange}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Cameras:</strong> {Array.isArray(report.cameras) ? report.cameras.join(', ') : report.cameras}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Format:</strong> {report.format}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>File Size:</strong> {report.fileSize}
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                fullWidth 
                variant="contained" 
                startIcon={<DownloadIcon />}
                onClick={() => handleDownloadReport(report)}
              >
                Download Full Report
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Root>
        <HeaderSection>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Reports & Forensic Summaries
            </Typography>
            <Typography variant="body1" color="textSecondary">
              AI-driven reports and forensic analysis from surveillance data
            </Typography>
          </Box>
        </HeaderSection>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
            <Tab label="Generate Reports" />
            <Tab label={`My Reports (${reports.length})`} />
            <Tab label="Custom Analysis" />
          </Tabs>
        </Box>

        {selectedTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Report Templates
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Choose from pre-configured report templates or create custom analysis
            </Typography>

            <Grid container spacing={3} sx={{ mt: 2 }}>
              {reportPresets.map((preset) => (
                <Grid item xs={12} sm={6} md={3} key={preset.id}>
                  <PresetCard 
                    onClick={() => setReportDialog({ open: true, preset })}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Box sx={{ color: `${preset.color}.main`, mr: 1 }}>
                          {preset.icon}
                        </Box>
                        <Typography variant="h6" component="div">
                          {preset.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        {preset.description}
                      </Typography>
                      <Chip 
                        label={preset.estimatedTime}
                        size="small"
                        color={preset.color}
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                    <CardActions>
                      <Button size="small" startIcon={<AIIcon />}>
                        Generate Report
                      </Button>
                    </CardActions>
                  </PresetCard>
                </Grid>
              ))}
            </Grid>

            {/* Generating Reports */}
            {generatingReports.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Generating Reports
                </Typography>
                {generatingReports.map((report) => (
                  <GeneratingCard key={report.id}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">{report.title}</Typography>
                        <CircularProgress size={24} />
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={report.progress} 
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2" color="textSecondary">
                        Generating report... {Math.round(report.progress)}% complete
                      </Typography>
                    </CardContent>
                  </GeneratingCard>
                ))}
              </Box>
            )}
          </Box>
        )}

        {selectedTab === 1 && (
          <Box>
            {reports.length === 0 ? (
              <Alert severity="info">
                No reports generated yet. Use the templates to create your first report.
              </Alert>
            ) : (
              reports.map((report) => (
                <ReportCard key={report.id}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {report.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          {report.summary}
                        </Typography>
                        <Box display="flex" gap={1} mt={1}>
                          <Chip label={report.format} size="small" />
                          <Chip label={report.fileSize} size="small" variant="outlined" />
                          <Chip 
                            label={report.status} 
                            size="small" 
                            color={report.status === 'completed' ? 'success' : 'warning'}
                          />
                        </Box>
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(report.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button 
                      startIcon={<ViewIcon />} 
                      onClick={() => handleViewReport(report)}
                    >
                      Preview
                    </Button>
                    <Button 
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownloadReport(report)}
                    >
                      Download
                    </Button>
                    <Button 
                      startIcon={<ShareIcon />}
                      onClick={() => handleShareReport(report)}
                    >
                      Share
                    </Button>
                    <IconButton 
                      onClick={() => handleDeleteReport(report.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </ReportCard>
              ))
            )}
          </Box>
        )}

        {selectedTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Custom AI Analysis
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Describe what you want to analyze in natural language
            </Typography>
            
            <Paper sx={{ p: 3, mt: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Describe your analysis request"
                placeholder="Example: List all humans that passed Camera 1 today, analyze their behavior patterns, and identify any suspicious activities..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                sx={{ mb: 3 }}
              />
              
              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<AIIcon />}
                  onClick={handleCustomReport}
                  disabled={!customPrompt.trim()}
                >
                  Generate Custom Report
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setCustomPrompt('')}
                >
                  Clear
                </Button>
              </Box>
            </Paper>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Example Prompts
              </Typography>
              <Grid container spacing={2}>
                {[
                  "Analyze foot traffic patterns for the main entrance during business hours",
                  "Identify and count all vehicles that entered the parking area this week",
                  "Review security incidents and provide risk assessment recommendations",
                  "Generate occupancy analytics for all monitored areas",
                  "Analyze after-hours activity and flag any anomalies"
                ].map((example, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Card 
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setCustomPrompt(example)}
                    >
                      <CardContent>
                        <Typography variant="body2">
                          {example}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        )}

        {/* Report Generation Dialog */}
        <ReportDialog
          open={reportDialog.open}
          onClose={() => setReportDialog({ open: false, preset: null })}
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                Generate {reportDialog.preset?.title}
              </Typography>
              <IconButton onClick={() => setReportDialog({ open: false, preset: null })}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {renderReportForm()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReportDialog({ open: false, preset: null })}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              startIcon={<AIIcon />}
              onClick={() => handleGenerateReport(reportDialog.preset)}
            >
              Generate Report
            </Button>
          </DialogActions>
        </ReportDialog>

        {/* Report Viewer Dialog */}
        <ViewerDialog
          open={viewerDialog.open}
          onClose={() => setViewerDialog({ open: false, report: null })}
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Report Preview</Typography>
              <IconButton onClick={() => setViewerDialog({ open: false, report: null })}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {viewerDialog.report && renderReportPreview(viewerDialog.report)}
          </DialogContent>
        </ViewerDialog>
      </Root>
  );
};

export default Reports;