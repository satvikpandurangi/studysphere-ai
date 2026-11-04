from pathlib import Path

root = Path(__file__).resolve().parent.parent / "outputs" / "studysphere-ai"

def replace(relative: str, changes: list[tuple[str, str]]) -> None:
    path = root / relative
    text = path.read_text(encoding="utf-8")
    for old, new in changes:
        if old not in text:
            raise RuntimeError(f"Missing expected text in {relative}: {old[:100]}")
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")

replace("src/pages/ParentPages.tsx", [
    (";school_approval_status:string", ""),
    ("c.approval_status==='approved'&&c.school_approval_status==='approved'?`${c.completed} lessons completed · ${c.quizzes} quizzes attempted`:c.approval_status!=='approved'?'Guardian approval pending':'School approval pending'", "c.approval_status==='approved'?`${c.completed} lessons completed · ${c.quizzes} quizzes attempted`:'Parent supervision paused'"),
    ("setSuccess('Student account created. Share the sign-in details securely with your child.')", "setSuccess('Parent-managed student account created. Share the sign-in details securely with your child.')"),
    ("<Plus size={18}/> Add a child", "<Plus size={18}/> Add a child (1–5)"),
    ("<h2>Create a student account</h2>", "<h2>Create a parent-managed student account</h2><p>For Standards 1–5. Students in Standards 6–10 can create their own account from the sign-up page.</p>"),
    ("catalog.data?.grades.map((g:Grade)=>", "catalog.data?.grades.filter((g:Grade)=>g.number<=5).map((g:Grade)=>"),
    ("The student account uses its own sign-in and cannot be activated without guardian approval.", "You can pause or restore this account’s learning access at any time."),
    ("c.approval_status==='approved'&&c.school_approval_status!=='approved'?'school pending':c.approval_status", "c.approval_status"),
])

replace("src/pages/ChildProgressPage.tsx", [
    (";school_approval_status:string", ""),
    ("student_id,name,school_name,board_name,grade_number,approval_status,school_approval_status", "student_id,name,school_name,board_name,grade_number,approval_status"),
    ("{data.child.approval_status!=='approved'||data.child.school_approval_status!=='approved'?<div className=\"notice\">Learning access is waiting for {data.child.approval_status!=='approved'?'guardian':'school'} approval.</div>:null}", "{data.child.approval_status!=='approved'?<div className=\"notice\">Learning access is paused by the parent or guardian.</div>:null}"),
])

replace("src/pages/StudentPages.tsx", [
    ("if(profile.data.approval_status!=='approved'||profile.data.school_approval_status!=='approved')return <div className=\"page\"><PageTitle title=\"Waiting for account approval\" subtitle=\"Your learning workspace opens after guardian and school approval.\"/></div>", "if(profile.data.approval_status!=='approved')return <div className=\"page\"><PageTitle title=\"Learning access paused\" subtitle=\"Your parent or guardian can restore this account from their workspace.\"/></div>"),
])

replace("src/lib/types.ts", [
    ("; school_approval_status: 'pending' | 'approved' | 'withdrawn'", ""),
])

replace("src/App.tsx", [
    ("const ApprovalsPage=lazy(()=>import('./pages/ApprovalsPage').then(m=>({default:m.ApprovalsPage})))\n", ""),
    ("<Route path=\"approvals\" element={<ApprovalsPage/>}/>", ""),
])

replace("src/components/AppShell.tsx", [
    (",{to:'/app/approvals',label:'Student approvals',icon:Users}", ""),
])

replace("src/main.tsx", [
    ("import './approvals.css'\n", ""),
])

print("Account policy UI updated")
