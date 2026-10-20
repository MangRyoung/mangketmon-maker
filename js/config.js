/* 공유 DB 설정. Supabase 프로젝트의 「Project URL」과 공개 키(anon public 또는 sb_publishable_…)를 넣는다.
   비워 두면 이 브라우저(localStorage)에만 저장된다. 이 키는 공개해도 되는 키다(권한은 DB 정책이 정한다). */
window.MKM_CONFIG={
  supabaseUrl:"https://jsnvqcvwspxzfnhdethl.supabase.co",
  supabaseKey:"sb_publishable_HDcgWnb1QS1P6GOiBPqdAA_yBJNhU7R",
  table:"docs",
  /* GM 서명 해시: 제작기 「서명」 창의 「이 비밀구의 해시 보기」로 만든 값. 이 해시와 맞는 비밀구를 적은 브라우저는 비공개 트레이너를 전부 본다 */
  gmHash:""
};
