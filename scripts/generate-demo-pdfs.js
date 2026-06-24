const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createPDF(filename, pagesContent) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  for (const pageContent of pagesContent) {
    const page = pdfDoc.addPage([600, 800]);
    const { height } = page.getSize();
    
    // Draw Title
    page.drawText(pageContent.title, {
      x: 50,
      y: height - 60,
      size: 20,
      font: boldFont,
      color: rgb(0.1, 0.34, 0.86), // Professional Blue
    });
    
    // Draw Subtitle / Header info
    page.drawText(`Company Policy Document | Page ${pagesContent.indexOf(pageContent) + 1}`, {
      x: 50,
      y: height - 85,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Draw thin horizontal line
    page.drawLine({
      start: { x: 50, y: height - 95 },
      end: { x: 550, y: height - 95 },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    // Draw Body text paragraphs
    let yPosition = height - 125;
    for (const paragraph of pageContent.body) {
      page.drawText(paragraph, {
        x: 50,
        y: yPosition,
        size: 11,
        font: font,
        color: rgb(0.1, 0.1, 0.1),
        lineHeight: 18,
        maxWidth: 500,
      });
      // Estimate height taken
      const lines = Math.ceil(paragraph.length / 75);
      yPosition -= (lines * 18 + 25);
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  const dir = path.join(__dirname, '..', 'public', 'demo-docs');
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, filename), pdfBytes);
  console.log(`Created PDF: ${filename} at ${path.join(dir, filename)}`);
}

async function generateAll() {
  // 1. Leave_Policy.pdf
  await createPDF('Leave_Policy.pdf', [
    {
      title: 'Leave Policy - Entitlements',
      body: [
        'This section details the leave entitlements for all full-time employees. Leaves are designed to encourage work-life balance and employee well-being.',
        'Casual Leaves: All employees are entitled to 12 casual leaves per year. Casual leaves are credited at the start of the calendar year and cannot be carried forward to the next year. Casual leaves are typically used for short personal reasons.',
        'Earned Leaves: Employees earn 15 earned leaves per year, accrued proportionally month-on-month. A maximum of 30 earned leaves can be carried forward to the next calendar year. Accumulation beyond 30 leaves will expire automatically.'
      ]
    },
    {
      title: 'Leave Policy - Application Process',
      body: [
        'Sick Leaves: Employees are entitled to 7 sick leaves per year to cover recovery from illness or medical emergencies. Sick leaves require manager notification on the day of absence. Medical certificates are required for absences exceeding 3 consecutive days.',
        'Maternity & Paternity Extension: The company provides a standard 3 days maternity/paternity extension policy. This extension is applicable immediately post the exhaust of standard parental leave periods and requires advance HR approval.',
        'Application Process: For planned leaves, employees must submit a leave application process with a minimum of 2 days advance notice to their supervisor. Leaves are approved subject to project delivery requirements.'
      ]
    }
  ]);

  // 2. Travel_Reimbursement_Policy.pdf
  await createPDF('Travel_Reimbursement_Policy.pdf', [
    {
      title: 'Travel Reimbursement Policy - Booking',
      body: [
        'The Travel Policy defines reimbursement rules for business travel. All business travel must be pre-approved by the department head.',
        'Flight Reimbursement: For all domestic and international business flights, flight reimbursement is limited to economy class only. Business class or premium economy bookings will not be reimbursed unless specifically approved by the CFO.',
        'Hotel Cap Limit: The maximum hotel cap per night is Rs 3000/night for tier 1 cities (such as Mumbai, Delhi, and Bangalore). For other cities, the limit is Rs 2000/night. Hotel bookings exceeding these limits must have written justification.'
      ]
    },
    {
      title: 'Travel Reimbursement Policy - Claims',
      body: [
        'Daily Food Allowance: Employees are entitled to a daily food allowance of Rs 500 during official outstation travel. This is a flat rate to cover lunch and dinner.',
        'Submission Limit: Employees must submit claims within 30 days of travel completion. Claims submitted after 30 days will be rejected automatically.',
        'Receipts Mandate: Submission of original bills and receipts is mandatory for amounts above Rs 200. For expenses under Rs 200, self-declaration is acceptable.'
      ]
    }
  ]);

  // 3. Attendance_Policy.pdf
  await createPDF('Attendance_Policy.pdf', [
    {
      title: 'Attendance & Work From Home Policy',
      body: [
        'Office Hours: Standard company office hours are 9:30 AM to 6:30 PM. Core working hours are from 10:00 AM to 5:00 PM during which all employees are expected to be available.',
        'Attendance Metric: A minimum 85% attendance required per month. Failure to meet this requirement will lead to HR reviews and potential performance improvement plans.',
        'Late Arrivals: Standard grace period is 15 minutes. 3 late arrivals in a month will result in 1 casual leave deducted from the employee\'s balance. If no casual leaves are left, it will be treated as leave without pay.',
        'Work From Home: Employees can avail work from home for a maximum of 2 days per week with manager approval. WFH is a privilege and depends on performance and project requirements.'
      ]
    }
  ]);

  // 4. Employee_Handbook.pdf
  await createPDF('Employee_Handbook.pdf', [
    {
      title: 'Employee Handbook - General Terms',
      body: [
        'Welcome to the Employee Handbook. This document outlines general employment conditions, employee codes of conduct, and organizational structure.',
        'Notice Period: The company requires a notice period of 60 days for all employees resigning from their roles. The notice period cannot be waived or adjusted against leaves without management consent.',
        'Probation Period: Newly joined employees undergo a probation period of 6 months. Upon successful completion of 6 months and a satisfactory manager review, employment is formalized.',
        'Performance Review: Performance review cycles are bi-annual, held in April and October. Promotions and salary adjustments are decided during the April cycle.'
      ]
    },
    {
      title: 'Employee Handbook - Onboarding & Conduct',
      body: [
        'Onboarding Documentation: The documents required for onboarding must be submitted on the day of joining. These include Aadhar card, PAN card, last 3 months payslips, and educational certificates.',
        'Code of Conduct: Employees must maintain professional integrity. The company maintains zero-tolerance policies for harassment, discrimination, and intellectual property leaks. Refer to the full compliance policy on the intranet.'
      ]
    }
  ]);
}

generateAll().catch(err => {
  console.error('Failed to generate PDFs:', err);
  process.exit(1);
});
