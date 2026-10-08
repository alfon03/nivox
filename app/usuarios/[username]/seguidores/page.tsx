import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileConnections } from "@/lib/social";
import { MaterialIcon } from "@/components/MaterialIcon";

type Props = { params: Promise<{ username: string }> };

export default async function FollowersPage({ params }: Props) {
  const { username } = await params;
  const data = await getProfileConnections(username, "followers");
  if (!data) notFound();
  return <ConnectionPage username={data.profile.username} title="Seguidores" people={data.people} />;
}

function ConnectionPage({ username, title, people }: { username: string; title: string; people: Array<any> }) {
  return <div className="shell pageStack narrowSocialPage"><Link className="backLink" href={`/usuarios/${username}`}><MaterialIcon name="arrow_back" size={17}/>@{username}</Link><div className="sectionTitle"><h1>{title}</h1><span>{people.length}</span></div>{people.length ? <div className="connectionList">{people.map((person) => <Link className="panel connectionCard" href={`/usuarios/${person.username}`} key={person.id}><span className="avatar">{person.username.slice(0,1).toUpperCase()}</span><div><b>@{person.username}</b>{person.full_name && <span>{person.full_name}</span>}<small>{person.bio || "Jugador NIVOX"}</small></div></Link>)}</div> : <div className="panel emptyState"><h3>Aún no hay nadie aquí</h3></div>}</div>;
}
