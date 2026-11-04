from pathlib import Path
path=Path('outputs/studysphere-ai/worker/index.ts')
text=path.read_text(encoding='utf-8')
old="const question=requireString(input.question,'question',1000);const {data:sources,error:searchError}=await a.client.rpc('search_lessons',{query:question,max_results:5});"
new="""const question=requireString(input.question,'question',1000);let conversationId:string|null=null;let history:{role:string;content:string}[]=[];if(input.conversationId){conversationId=uuid(input.conversationId,'conversation');const {data:owned}=await a.admin.from('ai_conversations').select('id').eq('id',conversationId).eq('student_id',a.user.id).maybeSingle();if(!owned)throw new Error('Conversation not found');const {data:prior}=await a.admin.from('ai_messages').select('role,content').eq('conversation_id',conversationId).order('created_at',{ascending:false}).limit(6);history=(prior||[]).reverse()}const previousQuestion=[...history].reverse().find(m=>m.role==='user')?.content||'';const searchQuery=question.length<30&&previousQuestion?`${previousQuestion} ${question}`:question;const {data:sources,error:searchError}=await a.client.rpc('search_lessons',{query:searchQuery,max_results:5});"""
assert old in text
text=text.replace(old,new)
old="Student question: ${question}`} ]})"
new="Recent dialogue for continuity only: ${history.map(m=>`${m.role}: ${m.content.slice(0,500)}`).join('\\n')}\\n\\nStudent question: ${question}`} ]})"
assert old in text
text=text.replace(old,new)
old="const {data:conversation}=await a.admin.from('ai_conversations').insert({student_id:a.user.id}).select('id').single();if(conversation)await a.admin.from('ai_messages').insert([{conversation_id:conversation.id,role:'user',content:question},{conversation_id:conversation.id,role:'assistant',content:answer,citations}]);return respond({answer,citations})"
new="if(!conversationId){const {data:created,error:creationError}=await a.admin.from('ai_conversations').insert({student_id:a.user.id}).select('id').single();if(creationError)throw creationError;conversationId=created.id}const {error:messageError}=await a.admin.from('ai_messages').insert([{conversation_id:conversationId,role:'user',content:question},{conversation_id:conversationId,role:'assistant',content:answer,citations}]);if(messageError)throw messageError;return respond({answer,citations,conversationId})"
assert old in text
text=text.replace(old,new)
path.write_text(text,encoding='utf-8')
